import React, { useEffect, useState } from 'react'
import api, { getErrorMessage } from '../services/api'
import { UserRound, Pencil, GraduationCap, Phone, School, Code2, FileText, BadgeCheck } from 'lucide-react'
import { PageHeader, SectionCard, Button, Field, Input, LoadingState, ErrorState, Avatar, SkillChips } from '../components/ui'

const joinList = (v) => Array.isArray(v) ? v.join(', ') : (v || '')

export default function StudentProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/students/me')
      .then(res => { setProfile(res.data); setForm(res.data); setLoading(false) })
      .catch((err) => { setError(getErrorMessage(err, 'Could not load profile')); setLoading(false) })
  }
  useEffect(load, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    const cgpa = form.cgpa === '' || form.cgpa === null || form.cgpa === undefined ? null : parseFloat(form.cgpa)
    if (cgpa !== null && (isNaN(cgpa) || cgpa < 0 || cgpa > 10)) { setError('CGPA must be between 0 and 10.'); setSaving(false); return }
    const backlogs = form.backlogs === '' || form.backlogs === null || form.backlogs === undefined ? null : parseInt(form.backlogs, 10)
    if (backlogs !== null && (isNaN(backlogs) || backlogs < 0)) { setError('Backlogs cannot be negative.'); setSaving(false); return }
    for (const k of ['tenthPercentage', 'twelfthPercentage']) {
      const v = form[k]
      if (v !== '' && v !== null && v !== undefined) {
        const n = parseFloat(v)
        if (isNaN(n) || n < 0 || n > 100) { setError(`${k} must be between 0 and 100.`); setSaving(false); return }
      }
    }
    try {
      const payload = { ...form }
      delete payload.id
      delete payload.email
      delete payload.registerNumber
      delete payload.role
      ;['skills', 'programmingLanguages', 'certifications', 'projects', 'internships'].forEach(k => {
        if (typeof payload[k] === 'string') payload[k] = payload[k].split(',').map(s => s.trim()).filter(Boolean)
      })
      if (payload.graduationYear) payload.graduationYear = parseInt(payload.graduationYear, 10)
      if (payload.cgpa !== undefined && payload.cgpa !== '' && payload.cgpa !== null) payload.cgpa = parseFloat(payload.cgpa)
      if (payload.backlogs !== undefined && payload.backlogs !== '' && payload.backlogs !== null) payload.backlogs = parseInt(payload.backlogs, 10)
      if (payload.tenthPercentage !== '' && payload.tenthPercentage !== undefined) payload.tenthPercentage = payload.tenthPercentage === null ? null : parseFloat(payload.tenthPercentage)
      if (payload.twelfthPercentage !== '' && payload.twelfthPercentage !== undefined) payload.twelfthPercentage = payload.twelfthPercentage === null ? null : parseFloat(payload.twelfthPercentage)
      const res = await api.put(`/students/${profile.id}`, payload)
      setProfile(res.data)
      setForm(res.data)
      setEditing(false)
      setSuccess('Profile updated. Eligibility now uses your new details automatically.')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save profile'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState lines={5} title="Loading profile…" />
  if (!profile) return <ErrorState message="Profile not found" detail={error} onRetry={load} />

  const textField = (label, fkey, type = 'text', step) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      {editing
        ? <Input type={type} step={step} value={form[fkey] ?? ''} onChange={e => setForm({ ...form, [fkey]: e.target.value })} />
        : <p className="font-semibold text-slate-900">{joinList(profile[fkey]) || '—'}</p>}
    </div>
  )

  const pct = profile.profileCompletion || 0

  return (
    <div>
      <PageHeader
        eyebrow="My profile"
        title={`${profile.name}`}
        subtitle={`${profile.registerNumber} · ${profile.email}`}
        actions={!editing
          ? <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Pencil size={15} /> Edit profile</Button>
          : <><Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm(profile); setError('') }}>Cancel</Button><Button variant="success" size="sm" loading={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save changes'}</Button></>}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3 mb-4">{success}</div>}

      <div className="surface p-5 md:p-6 mb-4 flex flex-wrap items-center gap-4">
        <Avatar name={profile.name} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <span className="chip">{profile.department || '—'}</span>
            <span className="chip">Class of {profile.graduationYear || '—'}</span>
            <span className="chip chip-ok">CGPA {profile.cgpa ?? '—'}</span>
            <span className="chip">{profile.backlogs ?? 0} backlogs</span>
          </div>
          <div className="mt-3 max-w-md">
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1"><span>Profile completion</span><span>{pct}%</span></div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand-500 transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Personal information" subtitle="Contact & college">
          <div className="grid sm:grid-cols-2 gap-4">
            {textField('Full name', 'name')}
            <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email</p><p className="font-semibold text-slate-900 break-all">{profile.email}</p></div>
            {textField('Phone', 'phone')}
            {textField('College', 'college')}
          </div>
        </SectionCard>
        <SectionCard title="Academics" subtitle="Feeds the eligibility engine">
          <div className="grid sm:grid-cols-2 gap-4">
            {textField('Department', 'department')}
            {textField('Graduation year', 'graduationYear', 'number')}
            {textField('CGPA', 'cgpa', 'number', '0.1')}
            {textField('Backlogs', 'backlogs', 'number')}
            {textField('10th %', 'tenthPercentage', 'number', '0.1')}
            {textField('12th %', 'twelfthPercentage', 'number', '0.1')}
          </div>
        </SectionCard>
        <SectionCard title="Skills & experience" subtitle="Comma separated when editing">
          <div className="space-y-3">
            <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Skills</p>{editing ? <Input value={Array.isArray(form.skills) ? form.skills.join(', ') : (form.skills || '')} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="Java, React, SQL" /> : <SkillChips skills={profile.skills || []} />}</div>
            {textField('Programming languages', 'programmingLanguages')}
            {textField('Certifications', 'certifications')}
            {textField('Projects', 'projects')}
            {textField('Internships', 'internships')}
          </div>
        </SectionCard>
        <SectionCard title="Documents & status" subtitle="Placement readiness">
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2 text-slate-600"><FileText size={15} className="text-slate-400" /> Resume: <strong className="text-slate-900">{profile.resume || 'Not uploaded'}</strong></p>
            <p className="flex items-center gap-2 text-slate-600"><BadgeCheck size={15} className="text-emerald-600" /> Eligibility refreshes automatically after every save.</p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-[13px] text-slate-600">
              Keep CGPA, backlogs, department, graduation year and skills accurate — drives filter on exactly these fields.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
