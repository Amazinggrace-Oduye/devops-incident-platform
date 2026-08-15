import { BadRequestException } from '@nestjs/common';
import { IncidentStatus } from '../common/enums';

const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [
    IncidentStatus.ACKNOWLEDGED,
    IncidentStatus.INVESTIGATING,
    IncidentStatus.RESOLVED,
  ],
  [IncidentStatus.ACKNOWLEDGED]: [
    IncidentStatus.INVESTIGATING,
    IncidentStatus.IDENTIFIED,
    IncidentStatus.RESOLVED,
  ],
  [IncidentStatus.INVESTIGATING]: [
    IncidentStatus.IDENTIFIED,
    IncidentStatus.MONITORING,
    IncidentStatus.RESOLVED,
  ],
  [IncidentStatus.IDENTIFIED]: [
    IncidentStatus.MONITORING,
    IncidentStatus.RESOLVED,
    IncidentStatus.INVESTIGATING,
  ],
  [IncidentStatus.MONITORING]: [
    IncidentStatus.RESOLVED,
    IncidentStatus.INVESTIGATING,
  ],
  [IncidentStatus.RESOLVED]: [],
};

export function assertTransitionAllowed(
  from: IncidentStatus,
  to: IncidentStatus,
): void {
  if (from === to) {
    throw new BadRequestException(`Incident is already ${from}`);
  }

  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Cannot transition incident from ${from} to ${to}`,
    );
  }
}
