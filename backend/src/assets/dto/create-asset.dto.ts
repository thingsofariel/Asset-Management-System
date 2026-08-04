import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { AssetType } from '@prisma/client';

export class CreateAssetDto {
  @IsString() name: string;
  @IsString() categoryId: string;
  @IsEnum(AssetType) assetType: AssetType;

  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsObject() specifications?: Record<string, string>;

  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsNumber() purchaseCost?: number;
  @IsOptional() @IsDateString() warrantyExpiry?: string;

  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() currentHolderId?: string;
}
