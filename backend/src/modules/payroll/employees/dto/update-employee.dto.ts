import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { EmploymentStatus, Role } from '@prisma/client';

// Deliberately does NOT allow changing nik or dateOfBirth here — same
// reasoning as the original: those are security-relevant (they double
// as PDF password seeds) and shouldn't be casually editable from a
// general "edit employee" form.
export class UpdateEmployeeDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsEnum(EmploymentStatus) employmentStatus?: EmploymentStatus;
  @IsOptional() @IsString() bankAccountNo?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
}
