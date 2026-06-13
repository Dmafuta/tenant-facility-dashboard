import type { Action, ResourceType, Subject } from './types'

type PolicyRule = {
  roles: Subject['role'][]
  actions: Action[]
  resources: ResourceType[]
}

const POLICY: PolicyRule[] = [
  // Facility manager — full access
  {
    roles: ['facility_manager'],
    actions: ['read','write','delete','export','unit.convert_type',
              'lease.create','lease.terminate','lease.renew',
              'charge.create','charge.waive','booking.confirm','booking.cancel',
              'access.grant','access.revoke','document.upload',
              'staff.onboard','staff.offboard','settings.modify'],
    resources: ['unit','person','lease','charge','work_order','booking',
                'access_event','access_credential','document','system_config'],
  },
  // Finance officer
  {
    roles: ['finance_officer'],
    actions: ['read','write','export','charge.create','charge.waive',
              'lease.create','lease.renew','document.upload'],
    resources: ['unit','person','lease','charge','document'],
  },
  // Maintenance supervisor
  {
    roles: ['maintenance_supervisor'],
    actions: ['read','write','export'],
    resources: ['unit','work_order','document'],
  },
  // Security officer
  {
    roles: ['security_officer'],
    actions: ['read','write','access.grant','access.revoke'],
    resources: ['unit','person','access_event','access_credential'],
  },
  // Receptionist
  {
    roles: ['receptionist'],
    actions: ['read','write'],
    resources: ['person','access_event','booking'],
  },
  // Owner — read-only on their own units
  {
    roles: ['owner'],
    actions: ['read','document.upload'],
    resources: ['unit','person','lease','charge','booking','document'],
  },
]

export function evaluate(
  subject: Subject,
  action: Action,
  resource: { type: ResourceType; id?: string | number; ownerId?: string }
): boolean {
  // Owner scope — can only see their own units
  if (subject.role === 'owner' && resource.ownerId && resource.ownerId !== subject.id) return false
  return POLICY.some(
    rule =>
      rule.roles.includes(subject.role) &&
      rule.actions.includes(action) &&
      rule.resources.includes(resource.type)
  )
}
