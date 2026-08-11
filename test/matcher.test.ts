import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchRemit } from '../src/reconcile/matcher';
import type { SubmittedClaim } from '../src/types';

const claims: SubmittedClaim[] = [
  {
    claimRef: 'RVB-2025-00041',
    memberId: 'XBC1234567',
    ssn: '123-45-6789',
    lastName: 'Garcia',
    firstName: 'Maria',
    dob: '03/15/1961',
  },
  {
    claimRef: 'RVB-2025-00055',
    memberId: 'XBC9999999',
    ssn: '567-89-0123',
    lastName: 'Williams',
    firstName: 'Sarah',
    dob: '05/14/1990',
  },
  {
    claimRef: 'RVB-2025-00056',
    memberId: 'SAM8888888',
    ssn: '678-90-1234',
    lastName: 'Williams',
    firstName: 'Sarah',
    dob: '09/28/1987',
  },
];

describe('reconcile/matcher', () => {
  it('happy path: matches on claim reference', () => {
    const hit = matchRemit({ claimRef: 'RVB-2025-00041', paidAmount: 185 }, claims);
    assert.equal(hit?.claimRef, 'RVB-2025-00041');
  });

  // INC-2022-441: clearinghouse dropped CLP claim ref; member id blank; SSN present
  it('regression INC-2022-441: falls back to ssn before name+dob', () => {
    const hit = matchRemit(
      {
        ssn: '123-45-6789',
        patientName: 'Garcia, Maria',
        dob: '03/15/1961',
        paidAmount: 185,
      },
      claims
    );
    assert.equal(hit?.claimRef, 'RVB-2025-00041');
  });

  // INC-2023-118: two Williams, Sarah patients; DOB must disambiguate when only name+dob available
  it('regression INC-2023-118: name+dob tiebreaker picks correct patient', () => {
    const hit = matchRemit(
      {
        patientName: 'Williams, Sarah',
        dob: '09/28/1987',
        paidAmount: 90,
      },
      claims
    );
    assert.equal(hit?.claimRef, 'RVB-2025-00056');
    assert.notEqual(hit?.claimRef, 'RVB-2025-00055');
  });
});
