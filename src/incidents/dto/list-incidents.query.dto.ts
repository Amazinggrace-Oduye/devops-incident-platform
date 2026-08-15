import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { IncidentSeverity, IncidentStatus } from '../../common/enums';

export class ListIncidentsQueryDto {
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
