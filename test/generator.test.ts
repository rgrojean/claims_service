import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { enrichClaim } from '../src/enrich/enrich';
import { generate837P } from '../src/generate/x12';
import type { Patient } from '../src/types';

const fixtures = join(__dirname, 'fixtures');
const golden = join(__dirname, 'golden');

describe('837P generator golden files', () => {
  it('commercial claim is byte-identical to golden', () => {
    const p: Patient = JSON.parse(readFileSync(join(fixtures, 'patient-garcia.json'), 'utf8'));
    const enriched = enrichClaim(
      {
        claimRef: 'RVB-2025-00041',
        patientId: '483921',
        payerId: 'BCBS_TN',
        memberId: 'XBC1234567',
        serviceDate: '2025-01-08',
        cpt: '99213',
        amount: 185.0,
        diagnosis: 'M545',
      },
      p
    );
    const actual = generate837P(enriched);
    const expected = readFileSync(join(golden, 'claim-commercial.837'), 'utf8');
    assert.equal(actual, expected);
    assert.match(actual, /\*MI\*XBC1234567/);
  });

  it('workers-comp claim writes SSN into subscriber id and matches golden', () => {
    const p: Patient = JSON.parse(readFileSync(join(fixtures, 'patient-garcia.json'), 'utf8'));
    const enriched = enrichClaim(
      {
        claimRef: 'RVB-2025-00042',
        patientId: '483921',
        payerId: 'TN_WORKERS_COMP',
        memberId: 'WC-IGNORE',
        serviceDate: '2025-01-09',
        cpt: '99214',
        amount: 240.0,
        diagnosis: 'S39012A',
      },
      p
    );
    const actual = generate837P(enriched);
    const expected = readFileSync(join(golden, 'claim-workers-comp.837'), 'utf8');
    assert.equal(actual, expected);
    assert.match(actual, /\*MI\*123-45-6789/);
  });
});
