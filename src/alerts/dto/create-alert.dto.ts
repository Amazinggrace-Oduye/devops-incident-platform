import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AlertSeverity } from '../../common/enums';

export class CreateAlertDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsUUID()
  incidentId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  /** When true, open a new incident and attach this alert to it. */
  @IsOptional()
  @IsBoolean()
  createIncident?: boolean;
}
