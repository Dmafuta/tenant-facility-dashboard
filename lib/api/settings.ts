import { apiFetch } from './fetch'

export interface FacilitySettings {
  property_name: string | null
  management_email: string | null
  contact_phone: string | null
  currency: string | null
  timezone: string | null
  rent_due_day: number | null
  grace_period_days: number | null
  late_fee_percent: number | null
  deposit_months: number | null
  service_charge_enabled: boolean | null
  auto_generate_charges: boolean | null
  notify_rent_overdue: boolean | null
  notify_payment_received: boolean | null
  notify_arrears_escalation: boolean | null
  notify_new_work_order: boolean | null
  notify_work_order_overdue: boolean | null
  notify_preventive_maintenance: boolean | null
  notify_breach_recorded: boolean | null
  notify_document_expiry: boolean | null
  notify_water_loss: boolean | null
  notify_meter_reading_due: boolean | null
}

export interface SystemUser {
  id: string
  email: string
  fullName: string
  role: string
  role_id: string | null
  status: string
  person_id: string | null
}

export interface RolePermission {
  action: string
  resource: string
}

export interface AppRole {
  id: string
  name: string
  description: string | null
  permissions: RolePermission[]
}

// ── Facility settings ─────────────────────────────────────────────────────────

export function getSettings(): Promise<FacilitySettings> {
  return apiFetch('/settings')
}

export function updateSettings(payload: Partial<FacilitySettings>): Promise<FacilitySettings> {
  return apiFetch('/settings', { method: 'PUT', body: JSON.stringify(payload) })
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function listSystemUsers(): Promise<SystemUser[]> {
  return apiFetch('/settings/users')
}

export function inviteUser(payload: { email: string; full_name: string; role_id: string }): Promise<SystemUser> {
  return apiFetch('/settings/users', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateSystemUser(id: string, payload: { role_id?: string; status?: string }): Promise<SystemUser> {
  return apiFetch(`/settings/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deactivateSystemUser(id: string): Promise<void> {
  return apiFetch(`/settings/users/${id}`, { method: 'DELETE' })
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export function listRoles(): Promise<AppRole[]> {
  return apiFetch('/roles')
}

export function createRole(payload: { name: string; description: string; permissions: RolePermission[] }): Promise<AppRole> {
  return apiFetch('/roles', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateRole(id: string, payload: { name?: string; description?: string; permissions?: RolePermission[] }): Promise<AppRole> {
  return apiFetch(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteRole(id: string): Promise<void> {
  return apiFetch(`/roles/${id}`, { method: 'DELETE' })
}

// ── Integration settings ───────────────────────────────────────────────────────

export interface EmailConfig {
  host: string
  port: string
  username: string
  password: string   // "***" if set, "" if not
  fromName: string
  configured: boolean
}

export interface AfricasTalkingConfig {
  username: string
  apiKey: string     // "***" if set
  senderId: string
  environment: string
  configured: boolean
}

export interface MpesaConfig {
  consumerKey: string        // "***" if set
  consumerSecret: string     // "***" if set
  shortcode: string
  passkey: string            // "***" if set
  initiatorName: string
  securityCredential: string // "***" if set
  callbackUrl: string
  b2cResultUrl: string
  b2cTimeoutUrl: string
  environment: string
  configured: boolean
}

export interface TelegramConfig {
  botToken: string   // "***" if set
  chatId: string
  configured: boolean
}

export interface IntegrationSettings {
  email: EmailConfig
  africastalking: AfricasTalkingConfig
  mpesa: MpesaConfig
  telegram: TelegramConfig
}

export function getIntegrations(): Promise<IntegrationSettings> {
  return apiFetch('/settings/integrations')
}

export function saveEmailIntegration(payload: Record<string, string>): Promise<IntegrationSettings> {
  return apiFetch('/settings/integrations/email', { method: 'PUT', body: JSON.stringify(payload) })
}

export function saveAfricasTalkingIntegration(payload: Record<string, string>): Promise<IntegrationSettings> {
  return apiFetch('/settings/integrations/africastalking', { method: 'PUT', body: JSON.stringify(payload) })
}

export function saveMpesaIntegration(payload: Record<string, string>): Promise<IntegrationSettings> {
  return apiFetch('/settings/integrations/mpesa', { method: 'PUT', body: JSON.stringify(payload) })
}

export function saveTelegramIntegration(payload: Record<string, string>): Promise<IntegrationSettings> {
  return apiFetch('/settings/integrations/telegram', { method: 'PUT', body: JSON.stringify(payload) })
}

export function testEmailIntegration(email: string): Promise<string> {
  return apiFetch('/settings/integrations/test/email', { method: 'POST', body: JSON.stringify({ email }) })
}

export function testSmsIntegration(phone: string): Promise<string> {
  return apiFetch('/settings/integrations/test/sms', { method: 'POST', body: JSON.stringify({ phone }) })
}

export function testTelegramIntegration(chatId?: string): Promise<string> {
  return apiFetch('/settings/integrations/test/telegram', { method: 'POST', body: JSON.stringify({ chatId: chatId ?? '' }) })
}

export function testMpesaIntegration(phone: string): Promise<{ accepted: boolean; customerMessage: string }> {
  return apiFetch('/settings/integrations/test/mpesa', { method: 'POST', body: JSON.stringify({ phone }) })
}

// ── MPesa Accounts ─────────────────────────────────────────────────────────────

export interface MpesaAccount {
  id: string
  name: string
  shortcode: string
  accountReference: string
  passkey: string            // "***" if set
  hasOwnCredentials: boolean
  consumerKey: string        // "***" if set
  consumerSecret: string     // "***" if set
  initiatorName: string | null
  securityCredential: string // "***" if set
  callbackUrl: string | null
  b2cResultUrl: string | null
  b2cTimeoutUrl: string | null
  environment: string
  isDefault: boolean
  active: boolean
  createdAt: string
}

export function listMpesaAccounts(): Promise<MpesaAccount[]> {
  return apiFetch('/settings/integrations/mpesa/accounts')
}

export function createMpesaAccount(payload: Record<string, unknown>): Promise<MpesaAccount> {
  return apiFetch('/settings/integrations/mpesa/accounts', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateMpesaAccount(id: string, payload: Record<string, unknown>): Promise<MpesaAccount> {
  return apiFetch(`/settings/integrations/mpesa/accounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteMpesaAccount(id: string): Promise<void> {
  return apiFetch(`/settings/integrations/mpesa/accounts/${id}`, { method: 'DELETE' })
}

export function setDefaultMpesaAccount(id: string): Promise<MpesaAccount[]> {
  return apiFetch(`/settings/integrations/mpesa/accounts/${id}/set-default`, { method: 'POST', body: '{}' })
}

export function testMpesaAccount(id: string, phone: string): Promise<{ accepted: boolean; customerMessage: string }> {
  return apiFetch(`/settings/integrations/mpesa/accounts/${id}/test`, { method: 'POST', body: JSON.stringify({ phone }) })
}

export function registerC2bUrls(payload: {
  account_id: string
  confirmation_url: string
  validation_url: string
  response_type: string
}): Promise<string> {
  return apiFetch('/mpesa/register-c2b-urls', { method: 'POST', body: JSON.stringify(payload) })
}
