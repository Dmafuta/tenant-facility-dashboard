import type { WorkOrder } from '@/lib/types'

export const WORK_ORDERS: WorkOrder[] = [
  { id:'WO-001', unit_id:'U-301', unit_label:'A-301', title:'Plumbing leak — bathroom',  description:'Water leaking under bathroom sink', category:'Plumbing',   priority:'urgent', status:'in_progress', reported_by:'Grace Njeri',  assigned_to:'Bob Ochieng', created_at:'2025-06-01' },
  { id:'WO-002', unit_id:'U-102', unit_label:'A-102', title:'AC unit not cooling',        description:'Air conditioning unit not working', category:'HVAC',       priority:'high',   status:'open',        reported_by:'Sarah Otieno',              created_at:'2025-06-03' },
  { id:'WO-003', unit_id:'U-201', unit_label:'A-201', title:'Broken window latch',        description:'Bedroom window latch is broken',    category:'Carpentry',  priority:'medium', status:'open',        reported_by:'Peter Ochieng',             created_at:'2025-06-05' },
  { id:'WO-004', unit_id:'S-01',  unit_label:'S-01',  title:'Electrical socket sparking', description:'Main socket near counter sparking',  category:'Electrical', priority:'urgent', status:'completed',   reported_by:'Mini Market',  assigned_to:'Dan Security', created_at:'2025-05-28', resolved_at:'2025-05-30' },
  { id:'WO-005', unit_id:'U-302', unit_label:'A-302', title:'Door lock stiff',            description:'Front door lock hard to turn',       category:'Locksmith',  priority:'low',    status:'open',        reported_by:'Rose Akinyi',               created_at:'2025-06-07' },
]
