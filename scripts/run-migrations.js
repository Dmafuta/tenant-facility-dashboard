#!/usr/bin/env node
/**
 * Run Supabase migrations.
 * 
 * HOW TO USE:
 *   1. Get your DB password from: Supabase Dashboard → Settings → Database → Connection string
 *   2. Run: DB_PASSWORD=yourpassword node scripts/run-migrations.js
 *
 * Or paste both SQL files directly in:
 *   https://supabase.com/dashboard/project/eijjcffyfenrspqxjrsl/sql/new
 */

const fs = require('fs')
const path = require('path')

const DB_URL = process.env.DATABASE_URL ||
  `postgresql://postgres.eijjcffyfenrspqxjrsl:${process.env.DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

async function run() {
  let client
  try {
    const { Client } = require('pg')
    client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
    await client.connect()
    console.log('✓ Connected to Supabase database')

    const migrations = [
      '001_initial_schema.sql',
      '002_domain_schema.sql',
    ]

    for (const file of migrations) {
      const sql = fs.readFileSync(
        path.join(__dirname, '..', 'supabase', 'migrations', file),
        'utf-8'
      )
      console.log(`→ Running ${file}...`)
      await client.query(sql)
      console.log(`✓ ${file} complete`)
    }

    console.log('\n✅ All migrations complete!')
  } catch (err) {
    console.error('✗ Migration failed:', err.message)
    process.exit(1)
  } finally {
    if (client) await client.end()
  }
}

run()
