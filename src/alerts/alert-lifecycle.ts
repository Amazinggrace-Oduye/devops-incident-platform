import { BadRequestException } from '@nestjs/common';
import { AlertStatus } from '../common/enums';

const ALLOWED_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  [AlertStatus.FIRING]: [AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED],
  [AlertStatus.ACKNOWLEDGED]: [AlertStatus.RESOLVED, AlertStatus.FIRING],
  [AlertStatus.RESOLVED]: [AlertStatus.FIRING],
};

export function assertAlertTransitionAllowed(
  from: AlertStatus,
  to: AlertStatus,
): void {
  if (from === to) {
    throw new BadRequestException(`Alert is already ${from}`);
  }

  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Cannot transition alert from ${from} to ${to}`,
    );
  }
}
