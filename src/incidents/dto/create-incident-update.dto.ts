import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { IncidentStatus } from '../../common/enums';

export class CreateIncidentUpdateDto {
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @IsOptional()
  @IsUUID()
  authorId?: string;
}
