import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLogDto {
  @IsString() assetId: string;
  @IsOptional() @IsString() scheduleId?: string;
  @IsDateString() serviceDate: string;
  @IsOptional() @IsString() vendorName?: string;
  @IsOptional() @IsString() technicianName?: string;
  @IsOptional() @IsString() partsReplaced?: string;
  @IsOptional() @IsNumber() cost?: number;
  @IsOptional() @IsString() notes?: string;
}
