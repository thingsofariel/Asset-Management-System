import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class InviteUserDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  // Only reachable by an ADMIN caller (see UsersController) — lets an
  // admin invite another admin, or default to EMPLOYEE.
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
