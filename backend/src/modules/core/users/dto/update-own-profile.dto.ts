import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateOwnProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
}
