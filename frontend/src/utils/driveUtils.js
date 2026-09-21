export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  if (isNaN(target)) return null
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

export function deadlineLabel(deadline) {
  const days = daysUntil(deadline)
  if (days === null) return ''
  if (days < 0) return 'Applications closed'
  if (days === 0) return 'Last day to apply!'
  if (days === 1) return '1 day remaining'
  return `${days} days remaining`
}

export function companyInitials(name) {
  if (!name) return '?'
  return String(name).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export const STATUS_STYLES = {
  REGISTERED: 'bg-blue-100 text-blue-800',
  APPLIED: 'bg-blue-100 text-blue-800',
  SHORTLISTED: 'bg-yellow-100 text-yellow-800',
  SELECTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-200 text-gray-600',
}

export function statusStyle(status) {
  if (!status) return 'bg-gray-100 text-gray-800'
  return STATUS_STYLES[String(status).toUpperCase()] || 'bg-gray-100 text-gray-800'
}

export const DRIVE_STATUS_STYLES = {
  draft: 'bg-gray-200 text-gray-700',
  published: 'bg-green-100 text-green-800',
  open: 'bg-green-100 text-green-800',
  closed: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function driveStatusStyle(status) {
  if (!status) return 'bg-gray-100 text-gray-800'
  return DRIVE_STATUS_STYLES[String(status).toLowerCase()] || 'bg-gray-100 text-gray-800'
}

export function safeLower(v) {
  return String(v || '').toLowerCase()
}
