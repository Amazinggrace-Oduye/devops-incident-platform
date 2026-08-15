import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { IncidentStatus } from '../../common/enums';

export class TransitionIncidentDto {
  @IsEnum(IncidentStatus)
  status!: IncidentStatus;

  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;
}
