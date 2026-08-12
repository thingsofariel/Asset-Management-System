import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EmploymentStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../../core/users/users.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

// nik and dateOfBirth are deliberately excluded — see the schema
// comment on Employee. passwordHash lives on User and was never
// exposed here even in the original.
const SAFE_EMPLOYEE_SELECT = {
  employeeId: true,
  jobTitle: true,
  employmentStatus: true,
  bankAccountNo: true,
  createdAt: true,
  user: {
    select: { id: true, fullName: true, email: true, role: true, avatarUrl: true, status: true },
  },
} as const;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  // Creates the login (via the same admin-invite flow used everywhere
  // else) and the HR record together, atomically — a payroll record
  // with no login, or an invited login with no payroll record, would
  // both be half-finished states.
  async create(dto: CreateEmployeeDto, invitedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const { user, inviteLink } = await this.usersService.invite(
        { fullName: dto.fullName, email: dto.email, departmentId: dto.departmentId, role: dto.role },
        invitedById,
        tx,
      );

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          jobTitle: dto.jobTitle,
          employmentStatus: dto.employmentStatus ?? EmploymentStatus.PERMANENT,
          bankAccountNo: dto.bankAccountNo,
          nik: dto.nik,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        },
        select: SAFE_EMPLOYEE_SELECT,
      });

      return { employee, inviteLink };
    });
  }

  findAll() {
    return this.prisma.employee.findMany({
      select: SAFE_EMPLOYEE_SELECT,
      orderBy: { user: { fullName: 'asc' } },
    });
  }

  async findByUserId(userId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { userId }, select: SAFE_EMPLOYEE_SELECT });
    if (!employee) throw new NotFoundException('Employee record not found');
    return employee;
  }

  async update(employeeId: number, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findUnique({ where: { employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.$transaction(async (tx) => {
      if (dto.fullName !== undefined || dto.email !== undefined || dto.role !== undefined) {
        if (dto.email) {
          const existing = await tx.user.findUnique({ where: { email: dto.email } });
          if (existing && existing.id !== employee.userId) {
            throw new ConflictException('An account with this email already exists');
          }
        }
        await tx.user.update({
          where: { id: employee.userId },
          data: { fullName: dto.fullName, email: dto.email, role: dto.role },
        });
      }

      return tx.employee.update({
        where: { employeeId },
        data: {
          jobTitle: dto.jobTitle,
          employmentStatus: dto.employmentStatus,
          bankAccountNo: dto.bankAccountNo,
        },
        select: SAFE_EMPLOYEE_SELECT,
      });
    });
  }

  // Deletes the Employee (payroll) record but deliberately does NOT
  // delete the underlying User — that identity is now shared with
  // assets/helpdesk, and other domains may still reference it (asset
  // custody, request contact info, etc.). Flipping it to DISABLED
  // blocks login without destroying shared history.
  async remove(employeeId: number, requestingUserId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    // Prevents an admin from removing their own employee record mid-session.
    if (employee.userId === requestingUserId) {
      throw new ForbiddenException('You cannot remove your own employee record while logged in');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.employee.delete({ where: { employeeId } });
        await tx.user.update({ where: { id: employee.userId }, data: { status: UserStatus.DISABLED } });
      });
    } catch (err: any) {
      // onDelete: Restrict on Payslip.employee — payroll history must
      // never silently disappear alongside the employee record.
      if (err.code === 'P2003' || err.code === 'P2014') {
        throw new ConflictException(
          'This employee cannot be deleted because they still have payslips or audit history on record. Remove or reassign those first.',
        );
      }
      throw err;
    }
  }
}
