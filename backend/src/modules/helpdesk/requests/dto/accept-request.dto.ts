import { IsEnum, IsOptional } from 'class-validator';
import { Priority } from '@prisma/client';

export class AcceptRequestDto {
  // Optional priority override at accept-time.
  @IsOptional() @IsEnum(Priority) priority?: Priority;
}
