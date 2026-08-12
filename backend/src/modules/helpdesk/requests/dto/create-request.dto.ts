import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Priority } from '@prisma/client';

export class CreateRequestDto {
  @IsString() fullName: string;
  @IsEmail() email: string;
  @IsString() phone: string;

  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsString() customCategoryText?: string;

  @IsString() @MaxLength(1000) description: string;

  // Requester's own selection, if offered on the form — takes precedence
  // over the category's defaultPriority. See RequestsService.create().
  @IsOptional() @IsEnum(Priority) priority?: Priority;
}
