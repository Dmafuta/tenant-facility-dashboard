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

type Row = Record<string, unknown>

function fmt(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtPeriod(s: string) {
  if (!s || !s.includes('-')) return s || '—'
  const [year, month] = s.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
}
function n(v: unknown): number { return Number(v) || 0 }

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Actual',
  estimated: 'Estimated',
  smart_iot: 'Smart Meter',
  vending_issue: 'Prepaid Vending',
}
const CHARGE_LABELS: Record<string, string> = {
  water: 'Water Charges (incl. Management Fee)',
  sewerage: 'Sewerage Charges',
  service_charge: 'Service Charge',
}

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

  const [invoice, categories, settings] = await Promise.all([
    serverFetch<Row>(`/invoices/${params.id}`, cookieHeader),
    serverFetch<Row[]>('/invoice-categories', cookieHeader),
    serverFetch<Row>('/settings', cookieHeader),
  ])

  if (!invoice) notFound()

  const inv = invoice
  const s = settings ?? {}
  const cat = (categories ?? []).find(c => c.code === inv.category_code) as Row | undefined

  // Fetch meter reading + recent readings for chart (WS invoices only)
  let mr: Row | null = null
  let recentReadings: Row[] = []
  if (inv.meter_reading_id) {
    mr = await serverFetch<Row>(`/meter-readings/${String(inv.meter_reading_id)}`, cookieHeader)
    if (mr?.meter_id) {
      const allReadings = await serverFetch<Row[]>(`/meters/${String(mr.meter_id)}/readings`, cookieHeader)
      recentReadings = (allReadings ?? []).slice(0, 4).reverse()
    }
  }

  const lineItems = (inv.line_items as Row[] | null) ?? []
  const payments  = (inv.payments  as Row[] | null) ?? []

  const propertyName = (s.property_name as string) || 'Management Office'
  const tagline      = (cat?.tagline as string) || ''
  const officeLoc    = (s.office_location as string) || ''
  const officeAddr   = (s.office_address  as string) || ''
  const officePhone  = (s.office_phone    as string) || (s.contact_phone as string) || ''
  const officeHours  = (s.office_hours    as string) || ''
  const bankName     = (cat?.bank_name    as string) || ''
  const bankAccount  = (cat?.bank_account as string) || ''
  const bankBranch   = (cat?.bank_branch  as string) || ''

  const isWS = inv.category_code === 'WS'
  const balanceFwd = n(inv.opening_balance) + n(inv.previous_balance) - n(inv.paid_amount)
  const chartMax   = recentReadings.length > 0
    ? Math.max(...recentReadings.map(r => n(r.units_consumed)), 1)
    : 1

  const showDetails = isWS && mr != null

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{String(inv.statement_no)} — {propertyName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #e7eaef;
            font-family: 'Libre Franklin', Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            color: oklch(0.30 0.03 250);
          }
          @page { size: letter; margin: 0; }
          @media print {
            html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { background: #fff; }
            .screen-pad { padding: 0 !important; }
            .sheet { box-shadow: none !important; margin: 0 !important; }
            .no-print { display: none !important; }
          }
          .screen-pad { padding: 32px 16px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
          .sheet { width: 816px; min-height: 1056px; background: #fff; box-shadow: 0 8px 40px rgba(20,33,61,0.16); display: flex; flex-direction: column; }
          .lbl { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; color: oklch(0.58 0.02 250); text-transform: uppercase; }
        `}</style>
      </head>
      <body>
        <div className="screen-pad">

          {/* Print / Close buttons */}
          <div className="no-print">
            <PrintTrigger />
          </div>

          <div className="sheet">

            {/* ── HEADER ── */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'18px 48px 12px',borderBottom:'3px solid oklch(0.40 0.06 250)'}}>
              <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
                <div style={{width:'56px',height:'56px',borderRadius:'50%',background:'oklch(0.40 0.06 250)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <div style={{width:'28px',height:'28px',border:'2.5px solid #fff',borderRadius:'0 50% 50% 50%',transform:'rotate(45deg)'}}></div>
                </div>
                <div>
                  <div style={{fontSize:'19px',fontWeight:800,letterSpacing:'-0.01em',color:'oklch(0.32 0.05 250)',lineHeight:1.1}}>{propertyName}</div>
                  {tagline && <div style={{fontSize:'11.5px',fontWeight:500,letterSpacing:'0.04em',color:'oklch(0.55 0.03 250)',marginTop:'3px'}}>{tagline}</div>}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'13px',fontWeight:700,letterSpacing:'0.14em',color:'oklch(0.50 0.05 250)'}}>STATEMENT</div>
                <div className="lbl" style={{marginTop:'6px'}}>Statement No.</div>
                <div style={{fontSize:'13px',fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{String(inv.statement_no)}</div>
              </div>
            </div>

            {/* ── ACCOUNT META STRIP ── */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',background:'oklch(0.97 0.008 250)',borderBottom:'1px solid oklch(0.90 0.01 250)'}}>
              {[
                ['Account No.',    String(inv.account_no || inv.unit_label || '—'), false],
                ['Billing Period', fmtPeriod(String(inv.period || '')),              false],
                ['Statement Date', fmtDate(inv.issue_date as string | null),         false],
                ['Payment Due',    fmtDate(inv.due_date   as string | null),         true ],
              ].map(([label, value, red], i, arr) => (
                <div key={i} style={{padding:'11px 20px',borderRight: i < arr.length - 1 ? '1px solid oklch(0.92 0.01 250)' : undefined}}>
                  <div className="lbl">{label as string}</div>
                  <div style={{fontSize:'14px',fontWeight:600,marginTop:'4px',fontVariantNumeric:'tabular-nums',color: red ? 'oklch(0.45 0.13 28)' : undefined}}>{value as string}</div>
                </div>
              ))}
            </div>

            {/* ── BILLED TO + AMOUNT DUE ── */}
            <div style={{display:'flex',padding:'14px 48px 10px',gap:'32px',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div className="lbl" style={{marginBottom:'8px'}}>Billed To</div>
                <div style={{fontSize:'15px',fontWeight:700,color:'oklch(0.30 0.04 250)'}}>{String(inv.person_name || '—')}</div>
                <div style={{fontSize:'13px',color:'oklch(0.45 0.02 250)',lineHeight:1.55,marginTop:'3px'}}>
                  {inv.unit_label && <div>Unit: {String(inv.unit_label)}</div>}
                  {inv.person_address && String(inv.person_address).split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
              <div style={{background:'oklch(0.34 0.05 250)',borderRadius:'4px',padding:'12px 28px',minWidth:'260px',textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:'11px',fontWeight:600,letterSpacing:'0.1em',color:'oklch(0.80 0.04 250)',textTransform:'uppercase'}}>Total Amount Due</div>
                <div style={{fontSize:'33px',fontWeight:800,color:'#fff',letterSpacing:'-0.02em',fontVariantNumeric:'tabular-nums',lineHeight:1.1,marginTop:'4px'}}>{fmt(n(inv.balance))}</div>
                {inv.due_date && <div style={{fontSize:'11.5px',color:'oklch(0.82 0.04 250)',marginTop:'6px'}}>Pay by {fmtDate(inv.due_date as string)} to avoid a late fee</div>}
              </div>
            </div>

            {/* ── STATEMENT SUMMARY ── */}
            <div style={{padding:'4px 48px 0'}}>
              <div style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.1em',color:'oklch(0.45 0.05 250)',textTransform:'uppercase',paddingBottom:'6px',borderBottom:'2px solid oklch(0.40 0.06 250)'}}>Statement Summary</div>

              {n(inv.opening_balance) > 0 && (
                <div style={{display:'flex',justifyContent:'space-between',padding:'6px 4px',borderBottom:'1px solid oklch(0.93 0.008 250)',fontSize:'13.5px'}}>
                  <span style={{color:'oklch(0.40 0.02 250)'}}>Opening balance</span>
                  <span style={{fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{fmt(n(inv.opening_balance))}</span>
                </div>
              )}

              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 4px',borderBottom:'1px solid oklch(0.93 0.008 250)',fontSize:'13.5px'}}>
                <span style={{color:'oklch(0.40 0.02 250)'}}>Previous balance</span>
                <span style={{fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{fmt(n(inv.previous_balance))}</span>
              </div>

              {payments.map((p, i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 4px',borderBottom:'1px solid oklch(0.93 0.008 250)',fontSize:'13.5px'}}>
                  <span style={{color:'oklch(0.40 0.02 250)'}}>
                    Payment received — {fmtDate(p.payment_date as string | null)}
                    {p.reference_no && p.reference_no !== '—' ? ` · Ref: ${String(p.reference_no)}` : ''}
                    {' '}<span style={{color:'oklch(0.50 0.10 150)',fontWeight:600}}>· Thank you</span>
                  </span>
                  <span style={{fontWeight:600,fontVariantNumeric:'tabular-nums',color:'oklch(0.50 0.10 150)'}}>−{fmt(n(p.amount))}</span>
                </div>
              ))}

              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 4px',borderBottom:'2px solid oklch(0.88 0.01 250)',fontSize:'13.5px'}}>
                <span style={{color:'oklch(0.30 0.03 250)',fontWeight:600}}>Balance brought forward</span>
                <span style={{fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{fmt(balanceFwd)}</span>
              </div>
            </div>

            {/* ── CURRENT CHARGES ── */}
            {lineItems.length > 0 && (
              <div style={{padding:'10px 48px 0'}}>
                <div style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.1em',color:'oklch(0.45 0.05 250)',textTransform:'uppercase',marginBottom:'4px'}}>
                  Current Charges — {fmtPeriod(String(inv.period || ''))}
                </div>

                {/* Column headers */}
                <div style={{display:'grid',gridTemplateColumns: showDetails ? '1fr auto auto' : '1fr auto',fontSize:'11px',fontWeight:600,letterSpacing:'0.05em',color:'oklch(0.60 0.02 250)',textTransform:'uppercase',padding:'8px 4px',borderBottom:'1px solid oklch(0.90 0.01 250)'}}>
                  <span>Description</span>
                  {showDetails && <span style={{textAlign:'right',paddingRight:'28px'}}>Details</span>}
                  <span style={{textAlign:'right',minWidth:'110px'}}>Amount</span>
                </div>

                {lineItems.map((li, i) => {
                  let detail = ''
                  if (showDetails && mr) {
                    if (li.charge_type === 'water') {
                      detail = `${n(mr.units_consumed).toFixed(1)} m³ @ KES ${n(mr.unit_cost).toFixed(2)}`
                    } else if (li.charge_type === 'sewerage') {
                      detail = '75% of water charge'
                    }
                  } else if (li.description) {
                    detail = String(li.description)
                  }
                  return (
                    <div key={i} style={{display:'grid',gridTemplateColumns: showDetails ? '1fr auto auto' : '1fr auto',alignItems:'center',fontSize:'13px',padding:'6px 4px',borderBottom:'1px solid oklch(0.94 0.006 250)'}}>
                      <span style={{color:'oklch(0.30 0.03 250)',fontWeight:600}}>
                        {CHARGE_LABELS[String(li.charge_type)] ?? String(li.charge_type)}
                      </span>
                      {showDetails
                        ? <span style={{textAlign:'right',paddingRight:'28px',color:'oklch(0.52 0.02 250)',fontSize:'12px',fontVariantNumeric:'tabular-nums'}}>{detail}</span>
                        : detail && <span style={{color:'oklch(0.52 0.02 250)',fontSize:'12px'}}>{detail}</span>
                      }
                      <span style={{textAlign:'right',minWidth:'110px',fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{fmt(n(li.amount))}</span>
                    </div>
                  )
                })}

                {/* Subtotal */}
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',fontSize:'13px',padding:'6px 4px',borderBottom:'2px solid oklch(0.88 0.01 250)'}}>
                  <span style={{color:'oklch(0.30 0.03 250)',fontWeight:700}}>Total current charges</span>
                  <span style={{textAlign:'right',minWidth:'110px',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{fmt(n(inv.current_charges))}</span>
                </div>

                {/* Grand total highlight box */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'oklch(0.96 0.012 250)',borderRadius:'4px',padding:'10px 16px',marginTop:'8px'}}>
                  <span style={{fontSize:'14px',fontWeight:700,color:'oklch(0.30 0.04 250)'}}>
                    Total amount due
                    <span style={{fontWeight:500,color:'oklch(0.55 0.02 250)',fontSize:'12px'}}> (balance forward + current charges)</span>
                  </span>
                  <span style={{fontSize:'22px',fontWeight:800,fontVariantNumeric:'tabular-nums',color:'oklch(0.34 0.05 250)'}}>{fmt(n(inv.balance))}</span>
                </div>
              </div>
            )}

            {/* ── CONSUMPTION CHART + METER READING (WS only) ── */}
            {isWS && mr && (
              <div style={{display:'grid',gridTemplateColumns:'1.35fr 1fr',gap:'32px',padding:'14px 48px 0'}}>

                {/* Bar chart */}
                <div>
                  <div style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.1em',color:'oklch(0.45 0.05 250)',textTransform:'uppercase',paddingBottom:'10px',borderBottom:'2px solid oklch(0.40 0.06 250)'}}>
                    Consumption — Last {recentReadings.length || 1} Month{recentReadings.length !== 1 ? 's' : ''}
                  </div>
                  {recentReadings.length > 0 ? (
                    <>
                      <div style={{display:'flex',alignItems:'flex-end',gap:'16px',height:'92px',padding:'12px 8px 0',borderBottom:'1px solid oklch(0.88 0.01 250)'}}>
                        {recentReadings.map((r, i) => {
                          const units = n(r.units_consumed)
                          const barH  = chartMax > 0 ? Math.round((units / chartMax) * 80) : 0
                          const isLast = i === recentReadings.length - 1
                          return (
                            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%'}}>
                              <div style={{fontSize:'12px',fontWeight:700,color: isLast ? 'oklch(0.40 0.06 250)' : 'oklch(0.45 0.05 250)',marginBottom:'4px',fontVariantNumeric:'tabular-nums'}}>{units.toFixed(0)}</div>
                              <div style={{width:'100%',maxWidth:'54px',height:`${barH}px`,background: isLast ? 'oklch(0.40 0.06 250)' : 'oklch(0.72 0.05 250)',borderRadius:'3px 3px 0 0'}}></div>
                            </div>
                          )
                        })}
                      </div>
                      <div style={{display:'flex',gap:'16px',padding:'6px 8px 0'}}>
                        {recentReadings.map((r, i) => {
                          const p = String(r.billing_period || '')
                          let lbl = p
                          if (p.includes('-')) {
                            const [, m] = p.split('-')
                            lbl = new Date(2000, Number(m) - 1).toLocaleDateString('en-KE', { month: 'short' })
                          }
                          return <div key={i} style={{flex:1,textAlign:'center',fontSize:'11.5px',fontWeight:600,color:'oklch(0.50 0.02 250)'}}>{lbl}</div>
                        })}
                      </div>
                      {recentReadings.length >= 2 && (
                        <div style={{fontSize:'11px',color:'oklch(0.58 0.02 250)',marginTop:'8px'}}>
                          Figures in cubic metres (m³). {recentReadings.length}-month average: {(recentReadings.reduce((a, r) => a + n(r.units_consumed), 0) / recentReadings.length).toFixed(1)} m³.
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{fontSize:'12px',color:'oklch(0.60 0.02 250)',padding:'16px 0'}}>No historical consumption data.</div>
                  )}
                </div>

                {/* Meter readings table */}
                <div>
                  <div style={{fontSize:'12px',fontWeight:700,letterSpacing:'0.1em',color:'oklch(0.45 0.05 250)',textTransform:'uppercase',paddingBottom:'10px',borderBottom:'2px solid oklch(0.40 0.06 250)'}}>Meter Reading</div>
                  {([
                    ['Meter No.',       String(mr.meter_number || '—')],
                    ['Previous reading', n(mr.previous_value).toFixed(0)],
                    ['Current reading',  n(mr.current_value).toFixed(0)],
                    ['Reading type',     SOURCE_LABELS[String(mr.source || '')] ?? 'Actual'],
                  ] as [string, string][]).map(([label, value], i) => (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 2px',borderBottom:'1px solid oklch(0.94 0.006 250)',fontSize:'13px'}}>
                      <span style={{color:'oklch(0.48 0.02 250)'}}>{label}</span>
                      <span style={{fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{value}</span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'7px 2px',fontSize:'13px'}}>
                    <span style={{color:'oklch(0.30 0.03 250)',fontWeight:700}}>Consumption</span>
                    <span style={{fontWeight:700,fontVariantNumeric:'tabular-nums',color:'oklch(0.34 0.05 250)'}}>{n(mr.units_consumed).toFixed(1)} m³</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── HOW TO PAY ── */}
            {(bankName || officePhone) && (
              <div style={{padding:'14px 48px 0'}}>
                <div style={{background:'oklch(0.97 0.008 250)',border:'1px solid oklch(0.91 0.01 250)',borderRadius:'4px',padding:'11px 22px',display:'grid',gridTemplateColumns: bankName && officePhone ? '1fr 1fr' : '1fr',gap:'20px'}}>
                  {bankName && (
                    <div>
                      <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.06em',color:'oklch(0.45 0.05 250)',textTransform:'uppercase',marginBottom:'6px'}}>Bank Transfer</div>
                      <div style={{fontSize:'12.5px',color:'oklch(0.42 0.02 250)',lineHeight:1.55}}>
                        <strong>{bankName}</strong>
                        {bankAccount && <><br />Account: {bankAccount}</>}
                        {bankBranch  && <><br />Branch: {bankBranch}</>}
                        <br /><span style={{color:'oklch(0.60 0.02 250)',fontSize:'11.5px'}}>Use {String(inv.unit_label || 'your unit number')} as reference</span>
                      </div>
                    </div>
                  )}
                  {officePhone && (
                    <div style={bankName ? {borderLeft:'1px solid oklch(0.90 0.01 250)',paddingLeft:'20px'} : {}}>
                      <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.06em',color:'oklch(0.45 0.05 250)',textTransform:'uppercase',marginBottom:'6px'}}>In Person</div>
                      <div style={{fontSize:'12.5px',color:'oklch(0.42 0.02 250)',lineHeight:1.55}}>
                        {officeLoc  && <><span>{officeLoc}</span><br /></>}
                        {officeAddr && <><span>{officeAddr}</span><br /></>}
                        Tel: <strong>{officePhone}</strong>
                        {officeHours && <><br />{officeHours}</>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{flex:1}} />

            {/* ── TEAR-OFF STUB ── */}
            <div style={{margin:'16px 48px 0',borderTop:'2px dashed oklch(0.78 0.02 250)',paddingTop:'10px'}}>
              <div style={{fontSize:'10px',color:'oklch(0.60 0.02 250)',letterSpacing:'0.05em',marginBottom:'10px'}}>✂  DETACH AND RETURN THIS PORTION WITH YOUR PAYMENT</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',gap:'36px'}}>
                  <div>
                    <div className="lbl">Account No.</div>
                    <div style={{fontSize:'14px',fontWeight:600,fontVariantNumeric:'tabular-nums',marginTop:'3px'}}>{String(inv.account_no || inv.unit_label || '—')}</div>
                  </div>
                  <div>
                    <div className="lbl">Due Date</div>
                    <div style={{fontSize:'14px',fontWeight:600,marginTop:'3px'}}>{fmtDate(inv.due_date as string | null)}</div>
                  </div>
                  <div>
                    <div className="lbl">Customer</div>
                    <div style={{fontSize:'14px',fontWeight:600,marginTop:'3px'}}>{String(inv.person_name || '—')}</div>
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div className="lbl">Amount Due</div>
                  <div style={{fontSize:'22px',fontWeight:800,fontVariantNumeric:'tabular-nums',color:'oklch(0.34 0.05 250)',marginTop:'2px'}}>{fmt(n(inv.balance))}</div>
                </div>
              </div>
            </div>

            {/* ── FOOTER BAR ── */}
            <div style={{marginTop:'16px',padding:'11px 48px',background:'oklch(0.34 0.05 250)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'11px',color:'oklch(0.82 0.04 250)'}}>
                {officePhone ? `Customer care: ${officePhone}` : 'This is a computer-generated statement.'}
              </span>
              <span style={{fontSize:'11px',color:'oklch(0.82 0.04 250)'}}>{propertyName}</span>
            </div>

          </div>
        </div>
      </body>
    </html>
  )
}
