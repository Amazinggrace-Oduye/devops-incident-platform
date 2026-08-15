import { IsUUID } from 'class-validator';

export class LinkIncidentDto {
  @IsUUID()
  incidentId!: string;
}
