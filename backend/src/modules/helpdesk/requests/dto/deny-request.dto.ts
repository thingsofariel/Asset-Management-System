import { IsString } from 'class-validator';

export class DenyRequestDto {
  @IsString() reason: string;
}
