import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { connectToDatabase, disconnectFromDatabase, rawCollection } from '../db/mongo.js';
import { logger } from '../lib/logger.js';

/**
 * Seeds the `life_expectancy` reference collection (BACKEND_SPEC §3.7).
 *
 * This collection has no model class — it is read straight through the driver by
 * `fetchBaseLifeExpectancy`. The Rails repo shipped no seeding code at all, which is why
 * §3.7 warns that **without this data every life-expectancy calculation returns a base of
 * zero**. That failure is silent: the API answers 200 and the dashboard shows a nonsense
 * "weeks left" instead of an error.
 *
 * Usage:
 *   npm run seed:life-expectancy                          # loads data/life_expectancy.json
 *   npm run seed:life-expectancy -- ./my-dataset.json
 *   npm run seed:life-expectancy -- ./my-dataset.csv
 *
 * Accepts a JSON array or a CSV with a `Country_Code,Gender,Type,Years` header.
 * Rows are upserted on (Country_Code, Gender, Type), so re-running is safe.
 */

interface LifeExpectancyRow {
  Country_Code: string;
  Gender: string;
  Type: string;
  Years: number;
}

const DEFAULT_DATASET = path.resolve(
  import.meta.dirname,
  '../../data/life_expectancy.json'
);

async function main(): Promise<void> {
  const target = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DATASET;
  const raw = await readFile(target, 'utf8');
  const rows = target.endsWith('.csv') ? parseCsv(raw) : parseJson(raw);

  if (rows.length === 0) {
    logger.error(`No usable rows found in ${target}`);
    process.exitCode = 1;
    return;
  }

  /*
   * Warn on the data, not on the filename.
   *
   * This keyed off `target === DEFAULT_DATASET`, so it shouted "those values are
   * placeholders" on every run even after the bundled file had been replaced with real
   * WHO figures. The `_readme` marker is what the shipped sample actually carries, so it
   * is the honest signal.
   */
  if (raw.includes('"_readme"')) {
    logger.warn(
      'This dataset still carries the sample `_readme` marker. Those values are ' +
        'placeholders — point this script at a real dataset before trusting any number ' +
        'the API returns.'
    );
  }

  await connectToDatabase();

  try {
    const collection = rawCollection('life_expectancy');
    await collection.createIndex(
      { Country_Code: 1, Gender: 1, Type: 1 },
      { unique: true, background: true }
    );

    const result = await collection.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { Country_Code: row.Country_Code, Gender: row.Gender, Type: row.Type },
          update: { $set: row },
          upsert: true,
        },
      }))
    );

    logger.info(
      `Seeded life_expectancy from ${target}: ` +
        `${result.upsertedCount} inserted, ${result.modifiedCount} updated, ${rows.length} total.`
    );
  } finally {
    await disconnectFromDatabase();
  }
}

function parseJson(raw: string): LifeExpectancyRow[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error('Expected the JSON file to contain an array');
  return parsed.filter(isUsableRow).map(normalizeRow);
}

function parseCsv(raw: string): LifeExpectancyRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((column) => column.trim());
  return lines
    .slice(1)
    .map((line) => {
      const cells = line.split(',').map((cell) => cell.trim());
      return Object.fromEntries(header.map((column, index) => [column, cells[index]]));
    })
    .filter(isUsableRow)
    .map(normalizeRow);
}

/** Skips the sample file's `_readme` entry and anything missing a required column. */
function isUsableRow(row: unknown): row is Record<string, unknown> {
  if (typeof row !== 'object' || row === null) return false;
  const candidate = row as Record<string, unknown>;
  if ('_readme' in candidate) return false;
  return (
    Boolean(candidate['Country_Code']) &&
    Boolean(candidate['Gender']) &&
    candidate['Years'] !== undefined
  );
}

function normalizeRow(row: Record<string, unknown>): LifeExpectancyRow {
  return {
    Country_Code: String(row['Country_Code']).trim(),
    // The lookup capitalises gender, so store it the same way: "Male" / "Female".
    Gender: capitalize(String(row['Gender']).trim()),
    Type: String(row['Type'] ?? 'LifeExpectancy_Gen').trim(),
    Years: Number(row['Years']),
  };
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value;
}

main().catch((error) => {
  logger.error('Seeding failed:', error);
  process.exit(1);
});
