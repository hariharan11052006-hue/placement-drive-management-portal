import React, { useEffect, useMemo, useState } from 'react'
import api, { getErrorMessage } from '../services/api'
import { CalendarDays, Plus, Pencil, Trash2, MapPin, Clock3, Video } from 'lucide-react'
import { PageHeader, Button, Field, Input, Select, Textarea, LoadingState, ErrorState, EmptyState, Modal } from '../components/ui'
import { formatDate } from '../utils/driveUtils'

const emptySchedule = { driveId: '', company: '', round: '', date: '', time: '', location: '', meetingLink: '', instructions: '' }
const ROUND_OPTIONS = ['Aptitude Test', 'Technical Test', 'Coding Round', 'Technical Interview', 'HR Round', 'Group Discussion', 'Other']
const ROUND_TONE = {
  'Aptitude Test': 'bg-brand-50 text-brand-700 border-brand-100',
  'Technical Test': 'bg-violet-50 text-violet-700 border-violet-100',
  'Coding Round': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Technical Interview': 'bg-sky-50 text-sky-700 border-sky-100',
  'HR Round': 'bg-amber-50 text-amber-700 border-amber-100',
}

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState([])
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptySchedule)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchAll = async () => {
    try {
      const [sRes, dRes] = await Promise.all([api.get('/schedules'), api.get('/drives?includeAll=true')])
      setSchedules(sRes.data || [])
      setDrives(dRes.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load schedules'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const grouped = useMemo(() => {
    const sorted = [...schedules].sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`))
    const map = new Map()
    sorted.forEach(s => {
      const key = s.date ? formatDate(s.date) : 'Unscheduled'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s)
    })
    return [...map.entries()]
  }, [schedules])

  const openCreate = () => { setEditing(null); setForm(emptySchedule); setShowForm(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({
      driveId: s.driveId || '', company: s.company || '', round: s.round || s.type || '',
      date: (s.date || '').slice(0, 10), time: s.time || '', location: s.location || s.venue || '',
      meetingLink: s.meetingLink || '', instructions: s.instructions || ''
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.date || (!form.round && !form.company && !form.driveId)) { setError('Round, date and drive/company are required.'); return }
    setSaving(true)
    try {
      const payload = {
        driveId: form.driveId || null,
        company: form.company,
        round: form.round,
        type: form.round,
        date: form.date,
        time: form.time,
        location: form.location,
        venue: form.location,
        meetingLink: form.meetingLink,
        instructions: form.instructions
      }
      if (editing) await api.put(`/schedules/${editing.id}`, payload)
      else await api.post('/schedules', payload)
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setError(getErrorMessage(err, 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await api.delete(`/schedules/${confirmDelete.id}`)
      setSchedules(schedules.filter(s => s.id !== confirmDelete.id))
    } catch (err) {
      alert(getErrorMessage(err, 'Delete failed'))
    } finally {
      setConfirmDelete(null)
    }
  }

  if (loading) return <LoadingState lines={5} title="Loading schedules…" />
  if (error && schedules.length === 0) return <ErrorState message="Could not load schedules" detail={error} onRetry={() => { setLoading(true); fetchAll() }} />

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Schedules"
        subtitle={`${schedules.length} rounds scheduled · students see only their drives`}
        actions={<Button onClick={openCreate}><Plus size={16} /> Add Schedule</Button>}
      />

      {showForm && (
        <form onSubmit={handleSave} className="surface p-5 md:p-6 mb-4 anim-pop">
          <h3 className="font-bold text-slate-900 mb-1">{editing ? 'Edit schedule' : 'New schedule'}</h3>
          <p className="text-sm text-slate-500 mb-4">Registered students are notified automatically.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Drive">
              <Select value={form.driveId} onChange={e => {
                const d = drives.find(x => String(x.id) === e.target.value)
                setForm({ ...form, driveId: e.target.value, company: d ? d.company : form.company })
              }}>
                <option value="">Select drive…</option>
                {drives.map(d => <option key={d.id} value={d.id}>{d.company} — {d.role}</option>)}
              </Select>
            </Field>
            <Field label="Company"><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="TCS" /></Field>
            <Field label="Round" required>
              <Select value={ROUND_OPTIONS.includes(form.round) ? form.round : (form.round ? 'Other' : '')} onChange={e => setForm({ ...form, round: e.target.value === 'Other' ? '' : e.target.value })}>
                <option value="">Select round…</option>
                {ROUND_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
              {(!ROUND_OPTIONS.includes(form.round)) && <Input value={form.round} onChange={e => setForm({ ...form, round: e.target.value })} placeholder="Custom round name" className="mt-2" />}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></Field>
              <Field label="Time"><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></Field>
            </div>
            <Field label="Location / Venue"><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Placement cell / Online" /></Field>
            <Field label="Meeting link"><Input value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })} placeholder="https://…" /></Field>
            <div className="md:col-span-2"><Field label="Instructions"><Textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={2} placeholder="Bring ID card, arrive 15 min early…" /></Field></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" loading={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create schedule'}</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {schedules.length === 0 ? (
        <EmptyState icon={<CalendarDays size={26} />} title="No schedules yet" subtitle="Add aptitude, technical and interview rounds for your drives." action={<Button size="sm" onClick={openCreate}><Plus size={15} /> Add Schedule</Button>} />
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{day}</p>
              <div className="relative pl-8 space-y-3">
                <span className="timeline-rail" aria-hidden />
                {items.map(s => (
                  <div key={s.id} className="surface surface-hover p-4 relative">
                    <span className="absolute -left-8 top-4 w-4 h-4 rounded-full bg-white border-[3px] border-brand-500" aria-hidden />
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[11px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-1 ${ROUND_TONE[s.round || s.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{s.round || s.type}</span>
                          <h3 className="font-extrabold text-slate-900">{s.company}</h3>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
                          <span className="inline-flex items-center gap-1"><Clock3 size={14} /> {s.time || '—'}</span>
                          {(s.location || s.venue) && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {s.location || s.venue}</span>}
                          {s.meetingLink && <a href={s.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"><Video size={14} /> Join</a>}
                        </div>
                        {s.instructions && <p className="mt-2 text-[13px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">{s.instructions}</p>}
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(s)}><Pencil size={14} /></Button>
                        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(s)}><Trash2 size={14} /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete schedule?"
        subtitle={`${confirmDelete?.round || confirmDelete?.type} · ${confirmDelete?.company}`}
        footer={<><Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="danger-solid" size="sm" onClick={handleDelete}>Delete</Button></>}>
        <p className="text-sm text-slate-600">Students registered for this drive will no longer see it.</p>
      </Modal>
    </div>
  )
}
