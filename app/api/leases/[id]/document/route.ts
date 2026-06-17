import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import path from 'path'
import fs from 'fs'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import mammoth from 'mammoth'

const TEMPLATE_PATH = path.join(process.cwd(), 'private', 'templates', 'lease-template.docx')
const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8081'

async function authHeader(): Promise<Record<string, string>> {
  const token = (await cookies()).get('access_token')?.value
  return token ? { Cookie: `access_token=${token}` } : {}
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const headers = await authHeader()

  // ── Fetch lease ────────────────────────────────────────────────────────────
  const leaseRes = await fetch(`${BACKEND}/api/leases/${params.id}`, {
    cache: 'no-store', headers,
  })
  if (!leaseRes.ok) {
    return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
  }
  const lease = (await leaseRes.json()).data

  // ── Fetch tenant details ───────────────────────────────────────────────────
  let tenant: Record<string, string> = {}
  if (lease.tenant_id) {
    const tRes = await fetch(`${BACKEND}/api/people/${lease.tenant_id}`, {
      cache: 'no-store', headers,
    })
    if (tRes.ok) tenant = (await tRes.json()).data ?? {}
  }

  // ── Fetch unit details ─────────────────────────────────────────────────────
  let unit: Record<string, unknown> = {}
  if (lease.unit_id) {
    const uRes = await fetch(`${BACKEND}/api/units/${lease.unit_id}`, {
      cache: 'no-store', headers,
    })
    if (uRes.ok) unit = (await uRes.json()).data ?? {}
  }

  // ── Build template variables ───────────────────────────────────────────────
  const vars: Record<string, string> = {
    // Lease
    lease_ref:          lease.id?.slice(0, 8).toUpperCase() ?? '—',
    lease_status:       (lease.status ?? '—').toUpperCase(),
    start_date:         fmtDate(lease.start_date),
    end_date:           fmtDate(lease.end_date),
    monthly_rent:       fmt(lease.monthly_rent),
    deposit:            fmt(lease.deposit),
    billing_cycle:      lease.billing_cycle ?? 'Monthly',
    next_billing_date:  fmtDate(lease.next_billing_date),
    notice_period:      '30',          // days — configurable later
    // Tenant
    tenant_name:        (lease.tenant_name ?? `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim()) || '—',
    tenant_id_number:   (tenant.national_id as string) ?? '—',
    tenant_phone:       (tenant.phone as string) ?? '—',
    tenant_email:       (tenant.email as string) ?? '—',
    // Unit
    unit_label:         (unit.unit_label as string) ?? lease.unit_label ?? '—',
    unit_floor:         (unit.floor as string) ?? '—',
    unit_block:         (unit.block as string) ?? '—',
    unit_bedrooms:      String(unit.bedrooms ?? '—'),
    unit_bathrooms:     String(unit.bathrooms ?? '—'),
    unit_size:          unit.floor_area_sqm ? `${unit.floor_area_sqm} sqm` : '—',
    // Management
    property_name:      'Green Valley Estate',
    management_company: 'Green Valley Management Ltd',
    management_address: 'P.O. Box 12345, Nairobi',
    management_phone:   '+254 700 000 000',
    management_email:   'management@greenvalley.co.ke',
    generated_date:     fmtDate(new Date().toISOString()),
  }

  // ── Fill Word template if it exists, otherwise use built-in HTML ───────────
  let html: string

  if (fs.existsSync(TEMPLATE_PATH)) {
    try {
      const content = fs.readFileSync(TEMPLATE_PATH)
      const zip = new PizZip(content)

      // Word often splits {{variable}} tags across multiple XML runs.
      // Fix: for each XML file in the zip that may contain template tags,
      // strip any XML markup that crept inside {{ ... }}.
      for (const filename of ['word/document.xml', 'word/header1.xml', 'word/footer1.xml']) {
        if (!zip.files[filename]) continue
        const raw = zip.files[filename].asText()
        const fixed = raw.replace(/\{\{([\s\S]*?)\}\}/g, (_match, inner) => {
          const varName = inner.replace(/<[^>]+>/g, '').trim()
          return `{{${varName}}}`
        })
        zip.file(filename, fixed)
      }

      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
      doc.render(vars)
      const filled = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
      const result = await mammoth.convertToHtml({ buffer: filled })
      html = result.value
    } catch (err: unknown) {
      const e = err as { properties?: { errors?: unknown[] } }
      console.error('[lease-doc] template error — falling back to built-in HTML:',
        JSON.stringify(e?.properties?.errors ?? err, null, 2))
      html = buildFallbackHtml(vars)
    }
  } else {
    // Built-in fallback template — replace once real template is uploaded
    html = buildFallbackHtml(vars)
  }

  // ── Wrap in print-ready page ───────────────────────────────────────────────
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tenancy Agreement — ${vars.unit_label} — ${vars.tenant_name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; background: #f0f0f0; }
    .page { width: 210mm; min-height: 297mm; margin: 10mm auto; background: white; padding: 25mm 20mm; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
    h1 { font-size: 16pt; text-align: center; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4mm; }
    h2 { font-size: 12pt; text-transform: uppercase; margin: 6mm 0 2mm; border-bottom: 1px solid #000; padding-bottom: 1mm; }
    p  { margin: 2mm 0; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin: 3mm 0; }
    td, th { border: 1px solid #ccc; padding: 2mm 3mm; font-size: 11pt; vertical-align: top; }
    th { background: #f5f5f5; font-weight: bold; width: 40%; }
    .print-btn { display: block; margin: 6mm auto 0; padding: 8px 24px; background: #1d4ed8; color: white; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; }
    @media print {
      body { background: white; }
      .page { margin: 0; box-shadow: none; padding: 15mm 15mm; }
      .print-btn { display: none; }
      @page { size: A4; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    ${html}
  </div>
  <div style="text-align:center;padding:8px;">
    <button class="print-btn" onclick="window.print()">⬇ Save as PDF / Print</button>
  </div>
  <script>
    // Auto-trigger print dialog if ?print=1
    if (new URLSearchParams(location.search).get('print') === '1') window.print();
  </script>
</body>
</html>`

  return new NextResponse(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// ── Fallback HTML template (used until Word template is uploaded) ─────────────
function buildFallbackHtml(v: Record<string, string>): string {
  return `
  <h1>Residential Tenancy Agreement</h1>
  <p style="text-align:center;font-size:10pt;color:#555;">Ref: ${v.lease_ref} &nbsp;|&nbsp; Generated: ${v.generated_date}</p>

  <h2>1. Parties</h2>
  <table>
    <tr><th>Landlord / Management</th><td>${v.management_company}<br>${v.management_address}<br>${v.management_phone} | ${v.management_email}</td></tr>
    <tr><th>Tenant</th><td>${v.tenant_name}<br>ID: ${v.tenant_id_number}<br>${v.tenant_phone} | ${v.tenant_email}</td></tr>
  </table>

  <h2>2. Premises</h2>
  <table>
    <tr><th>Property</th><td>${v.property_name}</td></tr>
    <tr><th>Unit</th><td>${v.unit_label}</td></tr>
    <tr><th>Block / Floor</th><td>Block ${v.unit_block}, Floor ${v.unit_floor}</td></tr>
    <tr><th>Description</th><td>${v.unit_bedrooms} bedroom(s), ${v.unit_bathrooms} bathroom(s) &mdash; ${v.unit_size}</td></tr>
  </table>

  <h2>3. Term</h2>
  <table>
    <tr><th>Commencement Date</th><td>${v.start_date}</td></tr>
    <tr><th>End Date</th><td>${v.end_date}</td></tr>
    <tr><th>Notice Period</th><td>${v.notice_period} days written notice required</td></tr>
  </table>

  <h2>4. Rent &amp; Financial Terms</h2>
  <table>
    <tr><th>Monthly Rent</th><td>${v.monthly_rent}</td></tr>
    <tr><th>Security Deposit</th><td>${v.deposit}</td></tr>
    <tr><th>Billing Cycle</th><td>${v.billing_cycle}</td></tr>
    <tr><th>Next Billing Date</th><td>${v.next_billing_date}</td></tr>
  </table>

  <h2>5. General Conditions</h2>
  <p>The Tenant agrees to:</p>
  <p>(a) Pay rent on or before the due date each month.</p>
  <p>(b) Keep the premises clean and in good repair.</p>
  <p>(c) Not sublet or assign the tenancy without written consent from the Landlord.</p>
  <p>(d) Allow the Landlord or its agents reasonable access for inspection with 24 hours' notice.</p>
  <p>(e) Comply with all estate rules and regulations as amended from time to time.</p>

  <h2>6. Signatures</h2>
  <table>
    <tr>
      <td style="padding:8mm 3mm;">
        <p><strong>Tenant</strong></p>
        <p style="margin-top:12mm;border-top:1px solid #000;padding-top:1mm;">${v.tenant_name}</p>
        <p>Date: ___________________</p>
      </td>
      <td style="padding:8mm 3mm;">
        <p><strong>For and on behalf of ${v.management_company}</strong></p>
        <p style="margin-top:12mm;border-top:1px solid #000;padding-top:1mm;">Authorised Signatory</p>
        <p>Date: ___________________</p>
      </td>
    </tr>
  </table>
  `
}
