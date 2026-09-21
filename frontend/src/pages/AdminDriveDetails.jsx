import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api, { getErrorMessage } from '../services/api'
import { ArrowLeft, Pencil, Trash2, MapPin, CalendarDays, Wallet, Users, Briefcase } from 'lucide-react'
import { PageHeader, SectionCard, Button, StatusBadge, LoadingState, ErrorState, EligibilityPanel, SkillChips, Modal } from '../components/ui'
import CompanyLogo from '../components/CompanyLogo'
import { formatDate } from '../utils/driveUtils'

export default function AdminDriveDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [drive, setDrive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    api.get(`/drives/${id}`)
      .then(res => { setDrive(res.data); setLoading(false) })
      .catch((err) => { setError(getErrorMessage(err, 'Drive not found')); setLoading(false) })
  }
  useEffect(load, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try { await api.delete(`/drives/${id}`); navigate('/admin/drives') }
    catch (err) { alert(getErrorMessage(err, 'Delete failed')); setDeleting(false); setConfirmDelete(false) }
  }

  if (loading) return <LoadingState lines={5} title="Loading drive…" />
  if (error || !drive) return <ErrorState message="Drive not found" detail={error} onRetry={load} />

  const skills = drive.requiredSkills?.length ? drive.requiredSkills : (drive.skills || [])
  const gradYears = drive.eligibleGraduationYears?.length ? drive.eligibleGraduationYears : (drive.graduationYear ? [drive.graduationYear].flat() : [])
  const depts = drive.eligibleDepartments || drive.departments || []
  const process = drive.selectionProcess || drive.recruitmentProcess || []

  return (
    <div>
      <PageHeader
        eyebrow="Drive details"
        title={`${drive.company} — ${drive.role}`}
        subtitle={`${drive.location || '—'} · Deadline ${formatDate(drive.deadline)}`}
        actions={<>
          <Link to="/admin/drives" className="btnx btnx-ghost btnx-sm"><ArrowLeft size={15} /> Drives</Link>
          <Link to={`/admin/drives/${drive.id}/edit`} className="btnx btnx-secondary btnx-sm"><Pencil size={15} /> Edit</Link>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete</Button>
        </>}
      />

      <div className="surface p-5 md:p-6 mb-4 flex flex-wrap items-center gap-4">
        <CompanyLogo name={drive.company} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900">{drive.company}</h2>
            <StatusBadge status={drive.status} />
          </div>
          <p className="text-slate-600 font-medium">{drive.role}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-1"><MapPin size={14} /> {drive.location || '—'}</span>
            <span className="inline-flex items-center gap-1"><Wallet size={14} /> {drive.salary || drive.package || '—'}</span>
            <span className="inline-flex items-center gap-1"><Briefcase size={14} /> {drive.workMode || '—'} · {drive.jobType || '—'}</span>
            <span className="inline-flex items-center gap-1"><Users size={14} /> {drive.openings ?? '—'} openings</span>
            <span className="inline-flex items-center gap-1"><CalendarDays size={14} /> Drive {formatDate(drive.driveDate)} · Apply by {formatDate(drive.deadline)}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SectionCard title="About the role" subtitle="Job description">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{drive.description || 'No description provided.'}</p>
          </SectionCard>
          <SectionCard title="Required skills" subtitle={`Any ${drive.minimumSkillsRequired ?? skills.length} of ${skills.length}`}>
            <SkillChips skills={skills} />
          </SectionCard>
          <SectionCard title="Selection process" subtitle={`${process.length || 0} rounds`}>
            {process.length === 0 ? <p className="text-sm text-slate-500">Not specified.</p> : (
              <ol className="flex flex-wrap gap-2">
                {process.map((s, i) => <li key={i} className="chip !py-1.5 !px-3"><span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center">{i + 1}</span> {s}</li>)}
              </ol>
            )}
          </SectionCard>
        </div>
        <div className="space-y-4">
          <SectionCard title="Eligibility rules" subtitle="Backend source of truth">
            <dl className="text-sm space-y-2.5">
              {[['Min CGPA', drive.minCgpa ?? '—'], ['Max backlogs', drive.maxBacklogs ?? '—'], ['Departments', (Array.isArray(depts) ? depts.join(', ') : depts) || 'All'], ['Graduation years', (Array.isArray(gradYears) ? gradYears.join(', ') : gradYears) || 'All'], ['10th %', drive.minTenthPercentage ?? '—'], ['12th %', drive.minTwelfthPercentage ?? '—']].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="font-bold text-slate-900 text-right">{String(v)}</dd></div>
              ))}
            </dl>
          </SectionCard>
          <SectionCard title="Test eligibility" subtitle="Checks your own admin profile if present">
            <EligibilityCheck driveId={drive.id} />
          </SectionCard>
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this drive?"
        subtitle={`${drive.company} · ${drive.role}`}
        footer={<><Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger-solid" size="sm" loading={deleting} onClick={handleDelete}>Delete drive</Button></>}>
        <p className="text-sm text-slate-600">Registration history is kept, but the drive disappears from listings.</p>
      </Modal>
    </div>
  )
}

function EligibilityCheck({ driveId }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const checkEligibility = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/drives/${driveId}/eligibility`)
      setResult(res.data)
    } catch (err) {
      setError(getErrorMessage(err, 'Eligibility check needs a student profile. Admins without one will see this message.'))
      setResult(null)
    }
    setLoading(false)
  }

  return (
    <div>
      <Button onClick={checkEligibility} loading={loading} size="sm" className="mb-3">{loading ? 'Checking…' : 'Check eligibility'}</Button>
      {error && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">{error}</p>}
      {result && <EligibilityPanel result={result} />}
    </div>
  )
}
