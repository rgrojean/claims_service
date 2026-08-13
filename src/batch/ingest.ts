import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { getPool } from '../db';
import { matchRemit } from '../reconcile/matcher';
import type { RemitRecord, SubmittedClaim } from '../types';

function parse835(raw: string): RemitRecord {
  const out: RemitRecord = {};
  for (const line of raw.split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const k = line.slice(0, eq);
    const v = line.slice(eq + 1).trim();
    if (k === 'CLP') out.claimRef = v;
    else if (k === 'MEMBER') out.memberId = v;
    else if (k === 'SSN') out.ssn = v;
    else if (k === 'NAME') out.patientName = v;
    else if (k === 'DOB') out.dob = v;
    else if (k === 'PAID') out.paidAmount = Number(v);
  }
  return out;
}

async function main() {
  const inbox = process.env.INBOX_DIR || './inbox';
  const pool = getPool();
  const claimsRes = await pool.query(
    `SELECT claim_ref, member_id, ssn, last_name, first_name, dob FROM claims WHERE status = 'submitted'`
  );
  const claims: SubmittedClaim[] = claimsRes.rows.map((r) => ({
    claimRef: r.claim_ref, memberId: r.member_id, ssn: r.ssn,
    lastName: r.last_name, firstName: r.first_name, dob: r.dob,
  }));

  for (const f of readdirSync(inbox).filter((x) => x.endsWith('.835'))) {
    const raw = readFileSync(join(inbox, f), 'utf8');
    const remit = parse835(raw);
    const match = matchRemit(remit, claims);
    const rem = await pool.query(
      `INSERT INTO remits (claim_ref, member_id, ssn, patient_name, dob, paid_amount, raw_content, matched_claim_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,(SELECT id FROM claims WHERE claim_ref = $8)) RETURNING id`,
      [remit.claimRef || null, remit.memberId || null, remit.ssn || null, remit.patientName || null,
        remit.dob || null, remit.paidAmount ?? null, raw, match?.claimRef || null]
    );
    if (!match) {
      await pool.query(`INSERT INTO reconciliation_exceptions (remit_id, reason) VALUES ($1,'unmatched_remit')`, [
        rem.rows[0].id,
      ]);
      console.log(`exception: ${f} unmatched`);
    } else {
      console.log(`matched ${f} -> ${match.claimRef}`);
    }
  }
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
