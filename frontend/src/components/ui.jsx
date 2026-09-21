import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Inbox, Loader2, SearchX } from 'lucide-react'

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

// ---------- Buttons ----------
export function Button({ variant = 'primary', size, className, loading, children, ...props }) {
  const v = variant === 'primary' ? 'btnx-primary' : variant === 'secondary' ? 'btnx-secondary' : variant === 'success' ? 'btnx-success' : variant === 'danger' ? 'btnx-danger' : variant === 'danger-solid' ? 'btnx-danger-solid' : variant === 'ghost' ? 'btnx-ghost' : 'btnx-primary'
  return (
    <button className={cx('btnx', v, size === 'sm' ? 'btnx-sm' : size === 'lg' ? 'btnx-lg' : '', className)} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

export function LinkButton({ to, variant = 'primary', size, className, children }) {
  const v = variant === 'primary' ? 'btnx-primary' : variant === 'secondary' ? 'btnx-secondary' : variant === 'success' ? 'btnx-success' : variant === 'danger' ? 'btnx-danger' : variant === 'ghost' ? 'btnx-ghost' : 'btnx-primary'
  return (
    <Link to={to} className={cx('btnx', v, size === 'sm' ? 'btnx-sm' : size === 'lg' ? 'btnx-lg' : '', className)}>
      {children}
    </Link>
  )
}

// ---------- Cards / layout ----------
export function Card({ className, hover, children }) {
  return <div className={cx('surface', hover && 'surface-hover', className)}>{children}</div>
}

export function PageHeader({ eyebrow, title, subtitle, actions, icon }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">{eyebrow}</p>}
        <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          {icon && <span className="text-brand-600">{icon}</span>}
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function SectionCard({ title, subtitle, actions, children, className }) {
  return (
    <div className={cx('surface p-5 md:p-6', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && <h3 className="font-bold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}

export function StatCard({ label, value, hint, icon, tone = 'blue' }) {
  const tones = {
    blue: 'bg-brand-50 text-brand-700 border-brand-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    purple: 'bg-violet-50 text-violet-700 border-violet-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  }
  return (
    <div className="surface surface-hover p-5 flex items-center gap-4 h-full">
      <div className={cx('w-12 h-12 rounded-xl border flex items-center justify-center shrink-0', tones[tone] || tones.blue)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 leading-tight">{value}</p>
        {hint && <p className="text-xs text-slate-500 mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  )
}

// ---------- Badges ----------
const badgeMap = {
  // drive status
  published: 'badge-green', open: 'badge-green',
  draft: 'badge-gray', closed: 'badge-yellow', cancelled: 'badge-red',
  // registration
  REGISTERED: 'badge-blue', APPLIED: 'badge-blue',
  SHORTLISTED: 'badge-yellow', SELECTED: 'badge-green',
  REJECTED: 'badge-red', WITHDRAWN: 'badge-gray',
  // eligibility
  Eligible: 'badge-green', eligible: 'badge-green',
  'Not Eligible': 'badge-red',
}

// Canonical display names — one term per state across the whole product.
// (Underlying API values are untouched; only the label changes.)
const displayNames = {
  REGISTERED: 'Applied', APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted', SELECTED: 'Selected',
  REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
  published: 'Published', open: 'Open',
  draft: 'Draft', closed: 'Closed', cancelled: 'Cancelled',
  Eligible: 'Eligible', eligible: 'Eligible',
  'Not Eligible': 'Not Eligible',
}

export function StatusBadge({ status }) {
  const key = String(status ?? '')
  const cls = badgeMap[key] || badgeMap[key.toLowerCase()] || 'badge-gray'
  return <span className={cx('badgex', cls)}>{displayNames[key] || displayNames[key.toLowerCase()] || key || '—'}</span>
}

export function Avatar({ name, size = 40, tone }) {
  const initials = String(name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const tones = ['bg-brand-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-sky-600', 'bg-rose-600']
  let idx = 0
  for (const ch of String(name || '')) idx = (idx + ch.charCodeAt(0)) % tones.length
  return (
    <div className={cx('rounded-xl text-white font-extrabold flex items-center justify-center shrink-0', tone || tones[idx])} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

// ---------- Forms ----------
export function Field({ label, hint, error, children, required }) {
  return (
    <div>
      {label && <label className="field-label">{label} {required && <span className="text-red-500">*</span>}</label>}
      {children}
      {hint && !error && <p className="help-text">{hint}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}

export function Input(props) {
  return <input {...props} className={cx('inputx', props.className, props['data-error'] && 'inputx-error')} />
}
export function Select(props) {
  return <select {...props} className={cx('selectx', props.className)} />
}
export function Textarea(props) {
  return <textarea {...props} className={cx('textareax', props.className)} />
}

// ---------- States ----------
export function LoadingState({ lines = 3, title = 'Loading…' }) {
  return (
    <div className="surface p-6" role="status" aria-live="polite">
      <p className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2"><Loader2 size={16} className="animate-spin text-brand-600" /> {title}</p>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="skeleton h-10" style={{ width: `${92 - i * 9}%` }} />
        ))}
      </div>
    </div>
  )
}

export function EmptyState({ icon = <Inbox size={28} />, title = 'Nothing here yet', subtitle, action }) {
  return (
    <div className="surface p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-4">{icon}</div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{subtitle}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({ message = "Something went wrong", detail, onRetry }) {
  return (
    <div className="surface p-8 text-center border-red-100">
      <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
        <AlertTriangle size={22} />
      </div>
      <h3 className="font-bold text-slate-900">{message}</h3>
      {detail && <p className="text-sm text-slate-500 mt-1">{detail}</p>}
      {onRetry && <div className="mt-4"><Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button></div>}
    </div>
  )
}

export function NoResults({ onClear }) {
  return (
    <div className="surface p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3"><SearchX size={22} /></div>
      <h3 className="font-bold">No results found</h3>
      <p className="text-sm text-slate-500 mt-1">Try adjusting search or filters.</p>
      {onClear && <div className="mt-3"><Button variant="ghost" size="sm" onClick={onClear}>Clear filters</Button></div>}
    </div>
  )
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, subtitle, children, footer, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/45" onClick={onClose} />
      <div className={cx('anim-pop relative surface p-0 w-full overflow-hidden', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btnx btnx-ghost btnx-sm" aria-label="Close">✕</button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

// ---------- Eligibility (visual only, uses backend result) ----------
export function EligibilityPanel({ result }) {
  if (!result) return <div className="surface p-5 text-sm text-slate-500">Eligibility could not be determined.</div>
  const eligible = !!result.eligible
  const reasons = result.reasons || []
  const skillMatch = result.skillMatch || {}
  const checks = result.checks || {}
  const rows = [
    { key: 'cgpa', label: 'CGPA' },
    { key: 'department', label: 'Department' },
    { key: 'backlogs', label: 'Backlogs' },
    { key: 'graduationYear', label: 'Graduation year' },
    { key: 'tenth', label: '10th %' },
    { key: 'twelfth', label: '12th %' },
    { key: 'skills', label: 'Skills' },
  ]
  return (
    <div className={cx('rounded-2xl border p-5', eligible ? 'bg-green-50/60 border-green-200' : 'bg-red-50/60 border-red-200')}>
      <div className="flex items-center gap-2 mb-1">
        {eligible
          ? <span className="badgex badge-green">✓ Eligible</span>
          : <span className="badgex badge-red">✕ Not eligible</span>}
        <span className="text-xs text-slate-500">Same backend result everywhere</span>
      </div>
      <p className={cx('text-sm font-medium mb-4', eligible ? 'text-green-900' : 'text-red-900')}>
        {eligible ? 'You meet all requirements for this placement drive.' : 'One or more requirements are not met. Details below.'}
      </p>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {rows.map(r => {
          const c = checks[r.key]
          const pass = c ? !!c.pass : !reasons.some(x => String(x.criterion).toLowerCase().includes(r.key === 'tenth' ? '10th' : r.key === 'twelfth' ? '12th' : r.label.toLowerCase().split(' ')[0]))
          return (
            <div key={r.key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="font-medium text-slate-700">{r.label}</span>
              <span className={cx('inline-flex items-center gap-1.5 text-xs font-bold', pass ? 'text-green-700' : 'text-red-700')}>
                {pass ? <CheckCircle2 size={15} /> : <span aria-hidden>✕</span>}
                {pass ? 'Passed' : 'Check'}
              </span>
            </div>
          )
        })}
      </div>
      {reasons.length > 0 && !eligible && (
        <ul className="mt-3 space-y-1.5 text-[13px] text-red-900">
          {reasons.map((x, i) => <li key={i} className="bg-white/70 border border-red-100 rounded-lg px-3 py-2">✕ {x.message}</li>)}
        </ul>
      )}
      {(skillMatch.matchedSkills?.length || skillMatch.missingSkills?.length) ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Skills — matched {skillMatch.matchedCount ?? 0} / {skillMatch.minimumRequired ?? 0}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(skillMatch.matchedSkills || []).map(s => <span key={'m' + s} className="chip chip-ok">✓ {s}</span>)}
            {(skillMatch.missingSkills || []).map(s => <span key={'x' + s} className="chip chip-miss">○ {s}</span>)}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function SkillChips({ skills = [], matched = [], missing = [] }) {
  const matchedSet = new Set((matched || []).map(s => String(s).toLowerCase()))
  const missingSet = new Set((missing || []).map(s => String(s).toLowerCase()))
  if (!skills.length) return <span className="text-slate-400 text-sm">—</span>
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {skills.slice(0, 6).map(s => {
        const low = String(s).toLowerCase()
        const isOk = matchedSet.has(low)
        const isMiss = missingSet.has(low)
        return <span key={s} className={cx('chip', isOk && 'chip-ok', isMiss && !isOk && 'chip-miss')}>{s}</span>
      })}
      {skills.length > 6 && <span className="chip">+{skills.length - 6}</span>}
    </span>
  )
}
