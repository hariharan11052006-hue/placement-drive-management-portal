import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api, { getErrorMessage } from '../services/api'
import { ArrowLeft, MapPin, CalendarDays, Wallet, Briefcase, Users } from 'lucide-react'
import { PageHeader, SectionCard, Button, StatusBadge, LoadingState, ErrorState, EligibilityPanel, SkillChips } from '../components/ui'
import CompanyLogo from '../components/CompanyLogo'
import { formatDate, deadlineLabel } from '../utils/driveUtils'

export default function StudentDriveDetails() {
  const { id } = useParams()
  const [drive, setDrive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [eligible, setEligible] = useState(null)
  const [application, setApplication] = useState(null)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setLoadError('')
    Promise.all([
      api.get(`/drives/${id}`).then(res => setDrive(res.data)).catch(() => { setLoadError('Drive not found'); }),
      api.get(`/drives/${id}/eligibility`).then(res => setEligible(res.data)).catch(() => setEligible(null)),
      api.get('/applications').then(res => {
        const found = (res.data || []).find(r => String(r.driveId) === String(id))
        setApplication(found || null)
      }).catch(() => {})
    ]).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  const handleRegister = async () => {
    setError('')
    setRegistering(true)
    try {
      const res = await api.post(`/drives/${id}/register`)
      setApplication(res.data)
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed'
      const reasons = err.response?.data?.eligibilityReasons || err.response?.data?.reasons
      setError(reasons?.length ? `${msg}: ${reasons.map(r => r.message).join(' ')}` : msg)
    } finally {
      setRegistering(false)
    }
  }

  if (loading) return <LoadingState lines={5} title="Loading drive…" />
  if (loadError || !drive) return <ErrorState message="Drive not found" detail={loadError} onRetry={load} />

  const registered = !!application
  const skills = drive.requiredSkills?.length ? drive.requiredSkills : (drive.skills || [])
  const process = drive.selectionProcess || drive.recruitmentProcess || []
  const depts = drive.eligibleDepartments || drive.departments || []

  return (
    <div>
      <Link to="/student/drives" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-4"><ArrowLeft size={14} /> Back to drives</Link>

      <div className="surface p-5 md:p-7 mb-4">
        <div className="flex flex-wrap items-start gap-4">
          <CompanyLogo name={drive.company} size={60} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{drive.company}</h1>
              <StatusBadge status={drive.status} />
              {registered && <StatusBadge status={application.status} />}
            </div>
            <p className="text-slate-600 font-medium text-lg">{drive.role}</p>
            <p className="text-lg font-extrabold text-emerald-700 mt-1">{drive.salary || drive.package || '—'}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
              <span className="inline-flex items-center gap-1"><MapPin size={14} /> {drive.location || '—'} · {drive.workMode || '—'}</span>
              <span className="inline-flex items-center gap-1"><Briefcase size={14} /> {drive.jobType || '—'}</span>
              <span className="inline-flex items-center gap-1"><Users size={14} /> {drive.openings ?? '—'} openings</span>
            </div>
          </div>
          <div className="w-full lg:w-72 shrink-0">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:sticky lg:top-20">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Application closes</p>
              <p className="font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5"><CalendarDays size={16} /> {formatDate(drive.deadline)}</p>
              <p className="text-xs font-bold text-brand-700 mt-1">{deadlineLabel(drive.deadline)}</p>
              <p className="text-xs text-slate-500 mt-2">Drive date: <strong className="text-slate-800">{formatDate(drive.driveDate)}</strong></p>
              <div className="mt-3">
                {registered ? (
                  <div>
                    <span className="badgex badge-green">✓ Applied</span>
                    <p className="text-xs text-slate-500 mt-2">Applied {formatDate(application.registeredAt)} · track in <Link to="/student/applications" className="font-bold text-brand-700 hover:underline">Applications</Link></p>
                  </div>
                ) : eligible?.eligible ? (
                  <Button variant="success" className="w-full" loading={registering} onClick={handleRegister}>{registering ? 'Applying…' : 'Apply now'}</Button>
                ) : (
                  <Button variant="secondary" className="w-full" onClick={() => document.getElementById('eligibility')?.scrollIntoView({ behavior: 'smooth' })}>Check eligibility</Button>
                )}
              </div>
              {error && <p className="mt-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">{error}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SectionCard title="About the role" subtitle="What you'll be doing">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{drive.description || 'No description provided.'}</p>
          </SectionCard>
          <SectionCard title="Required skills" subtitle={eligible?.skillMatch ? `Any ${eligible.skillMatch.minimumRequired} needed` : `Any ${drive.minimumSkillsRequired ?? skills.length} needed`}>
            <SkillChips skills={skills} matched={eligible?.skillMatch?.matchedSkills} missing={eligible?.skillMatch?.missingSkills} />
          </SectionCard>
          <SectionCard title="Selection process" subtitle={`${process.length || 0} rounds`}>
            {process.length === 0 ? <p className="text-sm text-slate-500">To be announced.</p> : (
              <ol className="space-y-2">
                {process.map((s, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm">
                    <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="font-semibold text-slate-800">{s}</span>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
          <SectionCard title="Important dates" subtitle="Don't miss the deadline">
            <div className="grid sm:grid-cols-3 gap-2.5 text-sm">
              {[['Posted', drive.createdAt || drive.postedDate], ['Drive', drive.driveDate], ['Deadline', drive.deadline]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k}</p>
                  <p className="font-extrabold text-slate-900 mt-0.5">{formatDate(v)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
        <div className="space-y-4" id="eligibility">
          <SectionCard title="Your eligibility" subtitle="Live backend result">
            <EligibilityPanel result={eligible} />
          </SectionCard>
          <SectionCard title="At a glance" subtitle="Key cutoffs">
            <dl className="text-sm space-y-2">
              {[['CGPA', drive.minCgpa ?? '—'], ['Backlogs', drive.maxBacklogs ?? '—'], ['Departments', (Array.isArray(depts) ? depts.join(', ') : depts) || 'All'], ['Grad years', (drive.eligibleGraduationYears?.length ? drive.eligibleGraduationYears.join(', ') : drive.graduationYear) || 'All']].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="font-bold text-slate-900 text-right">{String(v)}</dd></div>
              ))}
            </dl>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
