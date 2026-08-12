import { IsDateString, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { EmploymentStatus, Role } from '@prisma/client';

export class CreateEmployeeDto {
  // Identity/login fields — passed straight through to the same
  // admin-invite flow used everywhere else in the app.
  @IsString() fullName: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsEnum(Role) role?: Role;

  // HR/payroll fields.
  @IsString() jobTitle: string;
  @IsOptional() @IsEnum(EmploymentStatus) employmentStatus?: EmploymentStatus;
  @IsString() bankAccountNo: string;

  // Sensitive — see the schema comment on Employee.nik/dateOfBirth
  // about encrypting these at the application layer.
  @IsOptional() @IsString() nik?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
}
