import type { RemitRecord, SubmittedClaim } from '../types';

function nameKey(last: string | null | undefined, first: string | null | undefined): string {
  return `${(last || '').trim().toUpperCase()}|${(first || '').trim().toUpperCase()}`;
}

function splitRemitName(name: string): { last: string; first: string } {
  const i = name.indexOf(',');
  if (i < 0) return { last: name.trim(), first: '' };
  return { last: name.slice(0, i).trim(), first: name.slice(i + 1).trim() };
}

/**
 * Fallback order: claim reference → member ID → ssn → name+dob
 */
export function matchRemit(
  remit: RemitRecord,
  claims: SubmittedClaim[]
): SubmittedClaim | undefined {
  if (remit.claimRef) {
    const hit = claims.find((c) => c.claimRef === remit.claimRef);
    if (hit) return hit;
  }
  if (remit.memberId) {
    const hit = claims.find((c) => c.memberId && c.memberId === remit.memberId);
    if (hit) return hit;
  }
  if (remit.ssn) {
    const hit = claims.find((c) => c.ssn && c.ssn === remit.ssn);
    if (hit) return hit;
  }
  if (remit.patientName && remit.dob) {
    const { last, first } = splitRemitName(remit.patientName);
    const key = nameKey(last, first);
    const hit = claims.find(
      (c) => c.dob === remit.dob && nameKey(c.lastName, c.firstName) === key
    );
    if (hit) return hit;
  }
  return undefined;
}
