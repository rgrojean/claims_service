import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { splitName } from '../src/enrich/name';
import { enrichClaim } from '../src/enrich/enrich';
import type { Patient } from '../src/types';

const fixtures = join(__dirname, 'fixtures');

describe('enrich/name', () => {
  it('splits on a single comma', () => {
    assert.deepEqual(splitName('Garcia, Maria'), { lastName: 'Garcia', firstName: 'Maria' });
  });

  it('keeps multi-part surname left of the one comma', () => {
    assert.deepEqual(splitName('Garcia Lopez, Maria del Carmen'), {
      lastName: 'Garcia Lopez',
      firstName: 'Maria del Carmen',
    });
  });
});

describe('enrichClaim', () => {
  it('uses memberId for commercial payers', () => {
    const p: Patient = JSON.parse(readFileSync(join(fixtures, 'patient-garcia.json'), 'utf8'));
    const enriched = enrichClaim(
      {
        claimRef: 'RVB-1',
        patientId: p.patientId,
        payerId: 'BCBS_TN',
        memberId: 'XBC1234567',
        serviceDate: '2025-01-08',
        cpt: '99213',
        amount: 185,
        diagnosis: 'M545',
      },
      p
    );
    assert.equal(enriched.subscriberId, 'XBC1234567');
    assert.equal(enriched.subscriberIdSource, 'memberId');
    assert.equal(enriched.lastName, 'Garcia');
    assert.equal(enriched.firstName, 'Maria');
  });

  it('uses ssn for workers comp payers', () => {
    const p: Patient = JSON.parse(readFileSync(join(fixtures, 'patient-garcia.json'), 'utf8'));
    const enriched = enrichClaim(
      {
        claimRef: 'RVB-2',
        patientId: p.patientId,
        payerId: 'TN_WORKERS_COMP',
        memberId: 'WC-IGNORE',
        serviceDate: '2025-01-09',
        cpt: '99214',
        amount: 240,
        diagnosis: 'S39012A',
      },
      p
    );
    assert.equal(enriched.subscriberId, '123-45-6789');
    assert.equal(enriched.subscriberIdSource, 'ssn');
  });
});
