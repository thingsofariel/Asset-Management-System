import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsString() assetId: string;
  @IsEnum(MovementType) movementType: MovementType;

  @IsOptional() @IsString() toLocationId?: string; // INBOUND, TRANSFER, optionally CHECKIN
  @IsOptional() @IsString() toUserId?: string; // CHECKOUT
  @IsOptional() @IsString() notes?: string;
}
