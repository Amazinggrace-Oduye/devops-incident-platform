import { BadRequestException } from '@nestjs/common';
import { AlertStatus } from '../common/enums';
import { assertAlertTransitionAllowed } from './alert-lifecycle';

describe('assertAlertTransitionAllowed', () => {
  it('allows FIRING -> ACKNOWLEDGED', () => {
    expect(() =>
      assertAlertTransitionAllowed(
        AlertStatus.FIRING,
        AlertStatus.ACKNOWLEDGED,
      ),
    ).not.toThrow();
  });

  it('rejects RESOLVED -> ACKNOWLEDGED', () => {
    expect(() =>
      assertAlertTransitionAllowed(
        AlertStatus.RESOLVED,
        AlertStatus.ACKNOWLEDGED,
      ),
    ).toThrow(BadRequestException);
  });
});
