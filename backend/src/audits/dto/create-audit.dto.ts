import { IsString } from 'class-validator';

export class CreateAuditDto {
  @IsString() name: string;
}
