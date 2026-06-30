import type { Action, ResourceType, Subject } from './types'

type PolicyRule = {
  roles: string[]
  actions: Action[]
  resources: ResourceType[]
}

// Hardcoded fallback policy — used only when the subject has no dynamic permissions
const POLICY: PolicyRule[] = [
  {
    roles: ['facility_manager'],
    actions: ['read','write','delete','export','unit.convert_type',
              'lease.create','lease.terminate','lease.renew',
              'charge.create','charge.waive','booking.confirm','booking.cancel',
              'access.grant','access.revoke','document.upload',
              'staff.onboard','staff.offboard','kyc.verify','settings.modify'],
    resources: ['unit','person','lease','charge','work_order','booking',
                'access_event','access_credential','document','system_config'],
  },
  {
    roles: ['finance_officer'],
    actions: ['read','write','export','charge.create','charge.waive',
              'lease.create','lease.renew','document.upload','kyc.verify'],
    resources: ['unit','person','lease','charge','document'],
  },
  {
    roles: ['maintenance_supervisor'],
    actions: ['read','write','export'],
    resources: ['unit','work_order','document'],
  },
  {
    roles: ['security_officer'],
    actions: ['read','write','access.grant','access.revoke','kyc.verify'],
    resources: ['unit','person','access_event','access_credential'],
  },
  {
    roles: ['receptionist'],
    actions: ['read','write'],
    resources: ['person','unit','access_event','booking'],
  },
  {
    roles: ['owner'],
    actions: ['read','document.upload'],
    resources: ['unit','person','lease','charge','booking','document'],
  },
  {
    roles: ['meter_reader'],
    actions: ['read','write'],
    resources: ['utility','unit'],
  },
  {
    roles: ['bulk_meter_reader'],
    actions: ['read','write'],
    resources: ['utility','unit'],
  },
  {
    roles: ['field_technician'],
    actions: ['read','write'],
    resources: ['utility','unit'],
  },
]

export function evaluate(
  subject: Subject,
  action: Action,
  resource: { type: ResourceType; id?: string | number; ownerId?: string }
): boolean {
  // Dynamic permissions from DB take precedence
  if (subject.permissions && subject.permissions.length > 0) {
    return (
      subject.permissions.includes(`${action}:${resource.type}`) ||
      subject.permissions.includes(`${action}:*`) ||
      subject.permissions.includes('*')
    )
  }
  // Fallback: hardcoded policy for legacy roles
  if (subject.role === 'owner' && resource.ownerId && resource.ownerId !== subject.id) return false
  return POLICY.some(
    rule =>
      rule.roles.includes(subject.role) &&
      rule.actions.includes(action) &&
      rule.resources.includes(resource.type)
  )
}
