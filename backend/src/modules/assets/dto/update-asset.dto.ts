import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { AssetStatus, AssetType } from '@prisma/client';

// Written out explicitly (rather than PartialType(CreateAssetDto)) to avoid
// adding @nestjs/mapped-types as an extra dependency for one DTO.
export class UpdateAssetDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsEnum(AssetType) assetType?: AssetType;

  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsObject() specifications?: Record<string, string>;

  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsNumber() purchaseCost?: number;
  @IsOptional() @IsDateString() warrantyExpiry?: string;

  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() currentHolderId?: string;

  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
}
