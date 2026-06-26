import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import PrintTrigger from './PrintTrigger'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8081'

async function serverFetch<T>(path: string, cookieHeader: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND}/api${path}`, {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data as T
  } catch { return null }
}

function fmt(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
}
function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

const CAT_NAMES: Record<string,string> = {
  WS: 'Water & Sewerage Statement',
  SC: 'Service Charge Statement',
  OT: 'Other Charges Statement',
}
const CHARGE_LABELS: Record<string,string> = {
  water:          'Water Charges (incl. Management Fee)',
  sewerage:       'Sewerage Charges',
  service_charge: 'Service Charge',
}

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

  const [invoice, categories, settings] = await Promise.all([
    serverFetch<Record<string,unknown>>(`/invoices/${params.id}`, cookieHeader),
    serverFetch<Record<string,unknown>[]>('/invoice-categories', cookieHeader),
    serverFetch<Record<string,unknown>>('/settings', cookieHeader),
  ])

  if (!invoice) notFound()

  const inv = invoice as Record<string, unknown>
  const cat = (categories ?? []).find((c: Record<string,unknown>) => c.code === inv.category_code) as Record<string,unknown> | undefined
  const s   = (settings ?? {}) as Record<string,unknown>

  const lineItems = (inv.line_items as Record<string,unknown>[] | null) ?? []
  const payments  = (inv.payments  as Record<string,unknown>[] | null) ?? []

  const propertyName  = (s.property_name as string) || 'Management Office'
  const officeLoc     = (s.office_location as string) || ''
  const officeAddr    = (s.office_address  as string) || ''
  const officePhone   = (s.office_phone    as string) || (s.contact_phone as string) || ''
  const officeHours   = (s.office_hours    as string) || ''
  const tagline       = (cat?.tagline as string) || CAT_NAMES[inv.category_code as string] || 'Statement'
  const bankName      = (cat?.bank_name    as string) || ''
  const bankAccount   = (cat?.bank_account as string) || ''
  const bankBranch    = (cat?.bank_branch  as string) || ''

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{escHtml(String(inv.statement_no))} — {escHtml(propertyName)}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            @page { margin: 15mm; size: A4; }
          }
          .page { max-width: 720px; margin: 0 auto; padding: 20px; }

          /* Header */
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 3px solid #1e3a5f; }
          .prop-name { font-size: 20px; font-weight: 700; color: #1e3a5f; }
          .prop-sub  { font-size: 11px; color: #666; margin-top: 2px; }
          .stmt-block { text-align: right; }
          .stmt-no   { font-size: 14px; font-weight: 700; color: #1e3a5f; font-family: monospace; }
          .stmt-lbl  { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: .5px; }

          /* Info bar */
          .info-bar { background: #1e3a5f; color: #fff; padding: 10px 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; border-radius: 6px; }
          .info-item .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: #a8c0d6; }
          .info-item .val { font-size: 12px; font-weight: 600; margin-top: 2px; }

          /* Summary box */
          .summary { border: 2px solid #1e3a5f; border-radius: 6px; overflow: hidden; margin: 14px 0; }
          .summary-title { background: #1e3a5f; color: #fff; padding: 6px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
          .summary-body  { display: grid; grid-template-columns: 1fr 1fr; }
          .summary-row   { display: flex; justify-content: space-between; padding: 6px 14px; border-bottom: 1px solid #e8edf2; }
          .summary-row:last-child { border-bottom: none; }
          .summary-row.total { background: #f0f4f8; font-weight: 700; font-size: 13px; }
          .summary-row.total .amount { color: #c0392b; }
          .summary-row .amount { font-family: monospace; }
          .summary-row .paid   { color: #27ae60; }

          /* Table */
          .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #1e3a5f; margin: 16px 0 6px; border-bottom: 1px solid #e0e7ef; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f0f4f8; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; color: #555; padding: 6px 10px; text-align: left; border-bottom: 1px solid #dde3ea; }
          th.right, td.right { text-align: right; }
          td { padding: 6px 10px; border-bottom: 1px dashed #eef1f5; font-size: 11px; }
          tr:last-child td { border-bottom: none; }
          .subtotal-row td { font-weight: 700; border-top: 1px solid #ccc; background: #fafbfc; }

          /* Payment options */
          .pay-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 6px; }
          .pay-box  { border: 1px solid #dde3ea; border-radius: 6px; padding: 10px 12px; }
          .pay-box h4 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #1e3a5f; margin-bottom: 6px; }
          .pay-box p  { font-size: 11px; color: #333; margin-bottom: 2px; }
          .pay-box strong { color: #1e3a5f; }

          /* Footer */
          .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #dde3ea; font-size: 10px; color: #999; text-align: center; }

          /* Print button */
          .print-btn { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 16px; }
          .print-btn button { padding: 7px 16px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
          .btn-print { background: #1e3a5f; color: #fff; }
          .btn-close { background: #eee; color: #333; }
        `}</style>
      </head>
      <body>
        <div className="page">

          {/* Print controls */}
          <div className="print-btn no-print">
            <PrintTrigger />
            <button className="btn-close" style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: '#eee', color: '#333' }} onClick={() => window.close()}>Close</button>
          </div>

          {/* Header */}
          <div className="header">
            <div>
              <div className="prop-name">{propertyName}</div>
              <div className="prop-sub">{tagline}</div>
              {officeLoc && <div className="prop-sub">{officeLoc}</div>}
            </div>
            <div className="stmt-block">
              <div className="stmt-lbl">Statement No.</div>
              <div className="stmt-no">{String(inv.statement_no)}</div>
              <div className="stmt-lbl" style={{marginTop:'6px'}}>Issue Date</div>
              <div style={{fontSize:'11px'}}>{fmtDate(inv.issue_date as string | null)}</div>
            </div>
          </div>

          {/* Info bar */}
          <div className="info-bar">
            <div className="info-item">
              <div className="lbl">Bill To</div>
              <div className="val">{String(inv.person_name || '—')}</div>
              {inv.person_email != null && <div style={{fontSize:'10px',marginTop:'2px',color:'#c8dced'}}>{String(inv.person_email)}</div>}
            </div>
            <div className="info-item">
              <div className="lbl">Unit / Account</div>
              <div className="val">{String(inv.unit_label || '—')}</div>
              {inv.account_no != null && inv.account_no !== inv.unit_label && (
                <div style={{fontSize:'10px',marginTop:'2px',color:'#c8dced'}}>{String(inv.account_no)}</div>
              )}
            </div>
            <div className="info-item">
              <div className="lbl">Billing Period</div>
              <div className="val">{String(inv.period || '—')}</div>
              <div style={{fontSize:'10px',marginTop:'4px',color:'#c8dced'}}>Due: {fmtDate(inv.due_date as string | null)}</div>
            </div>
          </div>

          {/* Statement summary */}
          <div className="summary">
            <div className="summary-title">Statement Summary</div>
            <div>
              {Number(inv.opening_balance) > 0 && (
                <div className="summary-row">
                  <span>Opening Balance</span>
                  <span className="amount">{fmt(Number(inv.opening_balance) || 0)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Previous Balance</span>
                <span className="amount">{fmt(Number(inv.previous_balance) || 0)}</span>
              </div>
              <div className="summary-row">
                <span>Current Charges</span>
                <span className="amount">{fmt(Number(inv.current_charges) || 0)}</span>
              </div>
              <div className="summary-row">
                <span>Amount Paid</span>
                <span className="amount paid">− {fmt(Number(inv.paid_amount) || 0)}</span>
              </div>
              <div className="summary-row total">
                <span>Balance Due</span>
                <span className="amount">{fmt(Number(inv.balance) || 0)}</span>
              </div>
            </div>
          </div>

          {/* Current charges table */}
          {lineItems.length > 0 && (
            <>
              <div className="section-title">Current Charges</div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li: Record<string,unknown>, i: number) => (
                    <tr key={i}>
                      <td>{CHARGE_LABELS[li.charge_type as string] ?? String(li.charge_type)}{li.description ? ` — ${String(li.description)}` : ''}</td>
                      <td className="right">{fmt(Number(li.amount) || 0)}</td>
                    </tr>
                  ))}
                  <tr className="subtotal-row">
                    <td>Total Current Charges</td>
                    <td className="right">{fmt(Number(inv.current_charges) || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* Payment history */}
          {payments.length > 0 && (
            <>
              <div className="section-title">Payments Received</div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th className="right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: Record<string,unknown>, i: number) => (
                    <tr key={i}>
                      <td>{fmtDate(p.payment_date as string | null)}</td>
                      <td style={{textTransform:'capitalize'}}>{String(p.payment_method || '—')}</td>
                      <td style={{fontFamily:'monospace'}}>{String(p.reference_no || '—')}</td>
                      <td className="right" style={{color:'#27ae60'}}>{fmt(Number(p.amount) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Payment options */}
          {(bankName || officePhone) && (
            <>
              <div className="section-title">Payment Options</div>
              <div className="pay-grid">
                {bankName && (
                  <div className="pay-box">
                    <h4>Bank Transfer</h4>
                    <p>Bank: <strong>{bankName}</strong></p>
                    {bankAccount && <p>Account: <strong>{bankAccount}</strong></p>}
                    {bankBranch  && <p>Branch: <strong>{bankBranch}</strong></p>}
                    <p style={{marginTop:'4px',color:'#888',fontSize:'10px'}}>Use your unit number as reference</p>
                  </div>
                )}
                {officePhone && (
                  <div className="pay-box">
                    <h4>Pay at Office</h4>
                    {officeLoc  && <p>{officeLoc}</p>}
                    {officeAddr && <p>{officeAddr}</p>}
                    <p>Tel: <strong>{officePhone}</strong></p>
                    {officeHours && <p>Hours: {officeHours}</p>}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="footer">
            <p>This is a computer-generated statement. For queries contact: {officePhone || propertyName}.</p>
            <p style={{marginTop:'4px'}}>Printed on {new Date().toLocaleDateString('en-KE', {day:'numeric',month:'long',year:'numeric'})}</p>
          </div>

        </div>
      </body>
    </html>
  )
}
