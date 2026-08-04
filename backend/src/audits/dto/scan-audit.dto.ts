import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssetStatus } from '@prisma/client';

export class ScanAuditDto {
  @IsString() assetCode: string;
  @IsOptional() @IsString() scannedLocationId?: string;
  @IsOptional() @IsEnum(AssetStatus) conditionStatus?: AssetStatus;
  @IsOptional() @IsString() notes?: string;
}
