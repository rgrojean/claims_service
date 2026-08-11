import type { EnrichedClaim } from '../types';

function dobToD8(dob: string): string {
  // PIS ships MM/DD/YYYY
  const [mm, dd, yyyy] = dob.split('/');
  return `${yyyy}${mm}${dd}`;
}

function money(n: number): string {
  return n.toFixed(2);
}

/** Abbreviated but deterministic 837P — segment per line. */
export function generate837P(claim: EnrichedClaim): string {
  const ctl = claim.claimRef.replace(/\W/g, '').slice(-9).padStart(9, '0');
  const segs = [
    `ISA*00*          *00*          *ZZ*RIVERBEND      *ZZ*CLEARINGHOUSE  *250101*0130*^*00501*${ctl}*0*P*:`,
    `GS*HC*RIVERBEND*CLEARINGHOUSE*20250101*0130*1*X*005010X222A1`,
    `ST*837*0001*005010X222A1`,
    `BHT*0019*00*${claim.claimRef}*20250101*0130*CH`,
    `NM1*41*2*RIVERBEND HEALTH*****46*RVB001`,
    `NM1*40*2*CLEARINGHOUSE*****46*CH001`,
    `HL*1**20*1`,
    `NM1*PR*2*${claim.payerId}*****PI*${claim.payerId}`,
    `HL*2*1*22*0`,
    `NM1*IL*1*${claim.lastName.toUpperCase()}*${claim.firstName.toUpperCase()}****MI*${claim.subscriberId}`,
    `N3*${claim.address.line1}`,
    `N4*${claim.address.city}*${claim.address.state}*${claim.address.zip}`,
    `DMG*D8*${dobToD8(claim.dob)}*${claim.gender}`,
    `CLM*${claim.claimRef}*${money(claim.amount)}***11:B:1*Y*A*Y*Y`,
    `HI*ABK:${claim.diagnosis}`,
    `LX*1`,
    `SV1*HC:${claim.cpt}*${money(claim.amount)}*UN*1***1`,
    `DTP*472*D8*${claim.serviceDate.replace(/-/g, '')}`,
    `SE*16*0001`,
    `GE*1*1`,
    `IEA*1*${ctl}`,
  ];
  return segs.join('\n') + '\n';
}
