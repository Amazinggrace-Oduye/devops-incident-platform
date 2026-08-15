import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AlertSeverity, AlertStatus } from '../../common/enums';

export class ListAlertsQueryDto {
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsUUID()
  incidentId?: string;
}
