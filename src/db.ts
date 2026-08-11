import { Pool } from 'pg';
import type { EnrichedClaim } from './types';

export function getPool(): Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export async function insertSubmittedClaim(pool: Pool, e: EnrichedClaim, x12: string): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `INSERT INTO claims
        (claim_ref, patient_id, payer_id, member_id, subscriber_id, subscriber_id_source,
         ssn, last_name, first_name, dob, gender, enrichment_snapshot, x12_content, submitted_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),'submitted') RETURNING id`,
      [e.claimRef, e.patientId, e.payerId, e.memberId, e.subscriberId, e.subscriberIdSource,
        e.ssn, e.lastName, e.firstName, e.dob, e.gender, JSON.stringify(e), x12]
    );
    const claimId = r.rows[0].id as number;
    await client.query(
      `INSERT INTO claim_lines (claim_id, cpt, amount, service_date, diagnosis) VALUES ($1,$2,$3,$4,$5)`,
      [claimId, e.cpt, e.amount, e.serviceDate, e.diagnosis]
    );
    await client.query('COMMIT');
    return claimId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
