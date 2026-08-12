import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DeductionCategory, EarningCategory } from '@prisma/client';

class EarningItemDto {
  @IsString() label: string;
  @IsOptional() category?: EarningCategory;
  @IsNumber() amount: number;
}

class DeductionItemDto {
  @IsString() label: string;
  @IsOptional() category?: DeductionCategory;
  @IsNumber() amount: number;
}

export class CreatePayslipDto {
  @IsInt() employeeId: number;
  @IsInt() periodMonth: number;
  @IsInt() periodYear: number;
  @IsDateString() issueDate: string;
  @IsOptional() @IsString() issueLocation?: string;
  @IsNumber() basicSalary: number;
  @IsString() authorizedSignatory: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EarningItemDto)
  earnings?: EarningItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeductionItemDto)
  deductions?: DeductionItemDto[];
}
