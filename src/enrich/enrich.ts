import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { splitName } from './name';
import type { Encounter, EnrichedClaim, Patient } from '../types';

type Payer = { id: string; name: string; subscriberIdSource: string };

const payersFile = join(__dirname, '../../config/payers.yaml');
const payersDoc = yaml.load(readFileSync(payersFile, 'utf8')) as { payers: Payer[] };

export async function fetchPatient(patientId: string): Promise<Patient> {
  const base = process.env.PIS_URL;
  const res = await fetch(`${base}/v2/patients/${patientId}`);
  const p = await res.json();
  return p;
}

export function enrichClaim(encounter: Encounter, patient: Patient): EnrichedClaim {
  const p = patient;
  // incident-driven guards — not systematic validation
  if (!p.name) throw new Error(`patient ${encounter.patientId}: missing name`);
  if (!p.dob) throw new Error(`patient ${encounter.patientId}: missing dob`);

  const { lastName, firstName } = splitName(p.name);
  const payer = payersDoc.payers.find((x) => x.id === encounter.payerId);
  const source = payer?.subscriberIdSource || 'memberId';
  const subscriberId = source === 'ssn' ? p.ssn : encounter.memberId;

  return {
    claimRef: encounter.claimRef,
    patientId: encounter.patientId,
    payerId: encounter.payerId,
    memberId: encounter.memberId,
    subscriberId,
    subscriberIdSource: source,
    ssn: p.ssn,
    lastName,
    firstName,
    dob: p.dob,
    gender: p.gender,
    address: p.address,
    serviceDate: encounter.serviceDate,
    cpt: encounter.cpt,
    amount: encounter.amount,
    diagnosis: encounter.diagnosis,
  };
}
