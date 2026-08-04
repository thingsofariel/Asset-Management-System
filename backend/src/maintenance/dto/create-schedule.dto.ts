import { IsInt, IsOptional, IsDateString, IsString, Min } from 'class-validator';

export class CreateScheduleDto {
  @IsString() assetId: string;
  @IsInt() @Min(1) intervalMonths: number;
  @IsOptional() @IsDateString() nextDueDate?: string;
}
