import type { WaterSupplier, ReserveTank, WaterZone, WaterBalancePeriod } from '@/lib/types'

// ── Water Suppliers ───────────────────────────────────────────────────────

export const WATER_SUPPLIERS: WaterSupplier[] = [
  {
    id: 'WS-001',
    name: 'Nairobi City Water & Sewerage Co.',
    source_type: 'municipal',
    contact_name: 'Supply Manager',
    contact_phone: '+254 20 3300 000',
    contracted_rate_per_m3: 52,
    currency: 'KES',
    active: true,
    meter_ids: ['MTR-S01'],
    notes: 'Primary municipal supply. Subject to scheduled rationing on Tuesdays.',
  },
  {
    id: 'WS-002',
    name: 'Estate Borehole',
    source_type: 'borehole',
    contact_name: 'Maintenance Team',
    contact_phone: '+254 700 000 001',
    contracted_rate_per_m3: 18,
    currency: 'KES',
    active: true,
    meter_ids: ['MTR-S02'],
    notes: 'On-site borehole. Supplements municipal supply during rationing or shortage. Pumping cost only.',
  },
]

// ── Reserve Tanks ─────────────────────────────────────────────────────────

export const RESERVE_TANKS: ReserveTank[] = [
  {
    id: 'TK-001',
    name: 'Main Ground-Level Tank',
    capacity_m3: 120,
    current_level_m3: 74,
    location: 'Ground floor — plant room, south end',
    compartments: 2,
    inflow_meter_ids: ['MTR-S01', 'MTR-S02'],
    outflow_meter_ids: ['MTR-T01'],
    low_level_threshold_pct: 25,
    notes: 'Split into two 60 m³ compartments for maintenance flexibility. Level read by float sensor (auto) + manual dip weekly.',
  },
]

// ── Water Distribution Zones ───────────────────────────────────────────────

export const WATER_ZONES: WaterZone[] = [
  {
    id: 'WZ-A',
    name: 'Block A',
    description: 'All units in Block A (Floors 1–3)',
    tank_id: 'TK-001',
    distribution_meter_id: 'MTR-D01',
    unit_ids: ['U-101', 'U-102', 'U-103'],
  },
  {
    id: 'WZ-BC',
    name: 'Block B & C',
    description: 'All units in Block B and Block C',
    tank_id: 'TK-001',
    distribution_meter_id: 'MTR-D02',
    unit_ids: ['U-201', 'U-205', 'U-301', 'U-302'],
  },
]

// ── Water Balance Periods ─────────────────────────────────────────────────
// Balance equation: loss = inflow - outflow - tank_change
// loss_pct = (loss / inflow) * 100
// Threshold for flagging: >10%

export const WATER_BALANCE_PERIODS: WaterBalancePeriod[] = [
  // April 2024 — healthy month
  {
    id: 'WBP-2024-04',
    period: '2024-04',
    period_start: '2024-04-01',
    period_end: '2024-04-30',
    total_inflow_m3: 548,       // NCWSC 340 + Borehole 208
    total_outflow_m3: 505,      // sum of all consumer meters
    tank_level_start_m3: 62,
    tank_level_end_m3: 69,
    tank_change_m3: 7,          // tank topped up slightly
    gross_loss_m3: 36,          // 548 - 505 - 7 = 36
    loss_pct: 6.6,              // within normal range
    flagged: false,
    generated_at: '2024-05-02T08:00:00Z',
    zone_breakdown: [
      {
        zone_id: 'WZ-A',
        zone_name: 'Block A',
        distribution_m3: 238,
        consumer_m3: 225,
        loss_m3: 13,
        loss_pct: 5.5,
      },
      {
        zone_id: 'WZ-BC',
        zone_name: 'Block B & C',
        distribution_m3: 298,
        consumer_m3: 280,
        loss_m3: 18,
        loss_pct: 6.0,
      },
    ],
  },

  // May 2024 — normal with slight increase
  {
    id: 'WBP-2024-05',
    period: '2024-05',
    period_start: '2024-05-01',
    period_end: '2024-05-31',
    total_inflow_m3: 576,       // NCWSC 360 + Borehole 216
    total_outflow_m3: 525,      // matches sum of May readings (110+110+120+90+95 = 525)
    tank_level_start_m3: 69,
    tank_level_end_m3: 74,
    tank_change_m3: 5,
    gross_loss_m3: 46,          // 576 - 525 - 5 = 46
    loss_pct: 8.0,
    flagged: false,
    generated_at: '2024-06-02T08:00:00Z',
    notes: 'Slight loss increase from April. Zone B&C showing upward trend — inspect distribution pipe at pump room.',
    zone_breakdown: [
      {
        zone_id: 'WZ-A',
        zone_name: 'Block A',
        distribution_m3: 248,
        consumer_m3: 235,
        loss_m3: 13,
        loss_pct: 5.2,
      },
      {
        zone_id: 'WZ-BC',
        zone_name: 'Block B & C',
        distribution_m3: 323,
        consumer_m3: 290,
        loss_m3: 33,
        loss_pct: 10.2,
      },
    ],
  },

  // June 2024 — flagged, high loss in Block B&C
  {
    id: 'WBP-2024-06',
    period: '2024-06',
    period_start: '2024-06-01',
    period_end: '2024-06-30',
    total_inflow_m3: 602,       // NCWSC 374 + Borehole 228
    total_outflow_m3: 519,
    tank_level_start_m3: 74,
    tank_level_end_m3: 71,
    tank_change_m3: -3,         // drew down slightly
    gross_loss_m3: 86,          // 602 - 519 - (-3) = 86
    loss_pct: 14.3,             // flagged — above 10% threshold
    flagged: true,
    generated_at: '2024-07-01T08:00:00Z',
    notes: 'FLAGGED: Loss 14.3% — significantly above 10% threshold. Block B&C zone loss 21% suggests active leak. Maintenance team dispatched 2024-07-01.',
    zone_breakdown: [
      {
        zone_id: 'WZ-A',
        zone_name: 'Block A',
        distribution_m3: 245,
        consumer_m3: 238,
        loss_m3: 7,
        loss_pct: 2.9,          // Block A is fine
      },
      {
        zone_id: 'WZ-BC',
        zone_name: 'Block B & C',
        distribution_m3: 347,
        consumer_m3: 281,
        loss_m3: 66,
        loss_pct: 19.0,         // clearly a pipe problem here
      },
    ],
  },
]
