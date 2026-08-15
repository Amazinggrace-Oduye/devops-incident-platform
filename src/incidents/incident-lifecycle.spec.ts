import { BadRequestException } from '@nestjs/common';
import { IncidentStatus } from '../common/enums';
import { assertTransitionAllowed } from './incident-lifecycle';

describe('assertTransitionAllowed', () => {
  it('allows OPEN -> ACKNOWLEDGED', () => {
    expect(() =>
      assertTransitionAllowed(IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED),
    ).not.toThrow();
  });

  it('rejects RESOLVED -> OPEN', () => {
    expect(() =>
      assertTransitionAllowed(IncidentStatus.RESOLVED, IncidentStatus.OPEN),
    ).toThrow(BadRequestException);
  });

  it('rejects same-status transition', () => {
    expect(() =>
      assertTransitionAllowed(IncidentStatus.OPEN, IncidentStatus.OPEN),
    ).toThrow(BadRequestException);
  });
});
