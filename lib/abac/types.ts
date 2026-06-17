export type TenantRole =
  | 'facility_manager'
  | 'finance_officer'
  | 'maintenance_supervisor'
  | 'security_officer'
  | 'receptionist'
  | 'owner'
  | string  // dynamic roles from DB

export type Action =
  | 'read' | 'write' | 'delete' | 'export'
  | 'unit.convert_type'
  | 'lease.create' | 'lease.terminate' | 'lease.renew'
  | 'charge.create' | 'charge.waive'
  | 'booking.confirm' | 'booking.cancel'
  | 'access.grant' | 'access.revoke'
  | 'document.upload'
  | 'staff.onboard' | 'staff.offboard'
  | 'kyc.verify'
  | 'settings.modify'

export type ResourceType =
  | 'unit' | 'person' | 'lease' | 'charge'
  | 'work_order' | 'booking' | 'access_event'
  | 'access_credential' | 'document' | 'system_config'

export interface Resource {
  type: ResourceType
  id?: string | number
  ownerId?: string
}

export interface Subject {
  id: string
  role: TenantRole
  name: string
  email?: string
  phone?: string
  unit_ids?: string[]
  /** Dynamic permissions from DB — "action:resource" strings e.g. "read:unit" */
  permissions?: string[]
  twoFactorEnabled?: boolean
}
