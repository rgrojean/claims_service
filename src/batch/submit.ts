import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { enrichClaim, fetchPatient } from '../enrich/enrich';
import { generate837P } from '../generate/x12';
import { getPool, insertSubmittedClaim } from '../db';
import type { Encounter } from '../types';

async function main() {
  const outbox = process.env.OUTBOX_DIR || './outbox';
  if (!existsSync(outbox)) mkdirSync(outbox, { recursive: true });

  const workqueuePath = join(__dirname, '../../data/workqueue.json');
  const encounters: Encounter[] = JSON.parse(readFileSync(workqueuePath, 'utf8'));
  const pool = getPool();

  for (const enc of encounters) {
    const patient = await fetchPatient(enc.patientId);
    const enriched = enrichClaim(enc, patient);
    const x12 = generate837P(enriched);
    const file = join(outbox, `${enc.claimRef}.837`);
    writeFileSync(file, x12, 'utf8');
    await insertSubmittedClaim(pool, enriched, x12);
    console.log(`submitted ${enc.claimRef} -> ${file}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
