import React, { useEffect, useMemo, useState } from 'react'
import api, { getErrorMessage } from '../services/api'
import { Search, Users, ClipboardList, CheckCircle2, XCircle, Trophy, GraduationCap } from 'lucide-react'
import ExportButtons from '../components/ExportButtons'
import { PageHeader, StatCard, Button, Field, Input, Select, StatusBadge, Avatar, LoadingState, ErrorState, NoResults, Modal, SkillChips } from '../components/ui'
import CompanyLogo from '../components/CompanyLogo'
import { formatDate } from '../utils/driveUtils'

export default function AdminStudents() {
  const [tab, setTab] = useState('all')
  const [students, setStudents] = useState([])
  const [registered, setRegistered] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [cgpaFilter, setCgpaFilter] = useState('')
  const [regSearch, setRegSearch] = useState('')
  const [regDept, setRegDept] = useState('')
  const [regCompany, setRegCompany] = useState('')
  const [regStatus, setRegStatus] = useState('')
  const [regDrive, setRegDrive] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selected, setSelected] = useState(null)
  const [acting, setActing] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/students').then(res => setStudents(res.data || [])).catch(() => {}),
      api.get('/admin/registered-students').then(res => setRegistered(res.data || [])).catch(() => {})
    ]).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const departments = useMemo(() => [...new Set(students.map(s => s.department).filter(Boolean))], [students])
  const regDepartments = useMemo(() => [...new Set(registered.map(r => r.department).filter(Boolean))], [registered])
  const regCompanies = useMemo(() => [...new Set(registered.map(r => r.company).filter(Boolean))], [registered])
  const regDrives = useMemo(() => [...new Set(registered.map(r => r.driveName).filter(Boolean))], [registered])
  const regStatuses = [['REGISTERED', 'Applied'], ['SHORTLISTED', 'Shortlisted'], ['SELECTED', 'Selected'], ['REJECTED', 'Rejected']]

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || String(s.name || '').toLowerCase().includes(q) || String(s.email || '').toLowerCase().includes(q) || String(s.registerNumber || '').toLowerCase().includes(q)
    const matchDept = !deptFilter || s.department === deptFilter
    const matchCgpa = !cgpaFilter || Number(s.cgpa) >= parseFloat(cgpaFilter)
    return matchSearch && matchDept && matchCgpa
  })

  const filteredRegistered = registered
    .filter(r => {
      const q = regSearch.toLowerCase()
      const matchSearch = !q
        || String(r.studentName || '').toLowerCase().includes(q)
        || String(r.registerNumber || '').toLowerCase().includes(q)
        || String(r.company || '').toLowerCase().includes(q)
      const matchDept = !regDept || r.department === regDept
      const matchCompany = !regCompany || r.company === regCompany
      const matchStatus = !regStatus || r.applicationStatus === regStatus
      const matchDrive = !regDrive || r.driveName === regDrive
      return matchSearch && matchDept && matchCompany && matchStatus && matchDrive
    })
    .sort((a, b) => {
      const diff = new Date(a.registrationDate) - new Date(b.registrationDate)
      return sortOrder === 'asc' ? diff : -diff
    })

  const avgCgpa = students.length > 0 ? (students.reduce((sum, s) => sum + (parseFloat(s.cgpa) || 0), 0) / students.length).toFixed(2) : '—'

  const updateStatus = async (registrationId, status) => {
    setActing(true)
    try {
      await api.put(`/registrations/${registrationId}/status`, { status })
      const res = await api.get('/admin/registered-students')
      setRegistered(res.data || [])
      setSelected(prev => prev ? { ...prev, applicationStatus: status } : prev)
    } catch (err) {
      alert(getErrorMessage(err, 'Status update failed'))
    } finally {
      setActing(false)
    }
  }

  const viewStudentRegistrations = (name) => {
    setTab('registered')
    setRegSearch(name)
  }

  if (loading) return <LoadingState lines={6} title="Loading students…" />
  if (error) return <ErrorState message="Could not load students" detail={error} onRetry={load} />

  return (
    <div>
      <PageHeader
        eyebrow="Talent pool"
        title="Students"
        subtitle={`${students.length} registered · ${new Set(registered.map(r => r.studentId)).size} applied at least once`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Total students" value={students.length} icon={<Users size={20} />} tone="blue" />
        <StatCard label="Applied" value={new Set(registered.map(r => r.studentId)).size} icon={<ClipboardList size={20} />} tone="purple" />
        <StatCard label="Applications" value={registered.length} icon={<GraduationCap size={20} />} tone="slate" />
        <StatCard label="Average CGPA" value={avgCgpa} icon={<Trophy size={20} />} tone="green" />
      </div>

      <div className="inline-flex surface p-1 gap-1 mb-4">
        {[['all', `All Students`], ['registered', `Registered (${registered.length})`]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`btnx btnx-sm ${tab === v ? 'btnx-primary' : 'btnx-ghost'}`}>{l}</button>
        ))}
      </div>

      {tab === 'all' && (
        <>
          <div className="surface p-4 mb-4 grid sm:grid-cols-[1fr_200px_150px] gap-3">
            <Field label="Search">
              <div className="input-icon-wrap"><Search size={16} className="icon-left" /><Input placeholder="Name, email, register no…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            </Field>
            <Field label="Department">
              <Select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">All</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Min CGPA"><Input type="number" step={0.1} placeholder="7.0" value={cgpaFilter} onChange={e => setCgpaFilter(e.target.value)} /></Field>
          </div>
          {filteredStudents.length === 0 ? <NoResults onClear={() => { setSearch(''); setDeptFilter(''); setCgpaFilter('') }} /> : (
            <div className="table-shell"><div className="table-scroll"><table className="tablex tablex-fixed" style={{ minWidth: 760 }}>
              <colgroup>
                <col />
                <col style={{ width: 150 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead><tr><th>Student</th><th>Department</th><th>CGPA</th><th>Backlogs</th><th>Grad</th><th style={{ textAlign: 'right' }}>Applications</th></tr></thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={student.name} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="cell-main">{student.name || '—'}</span>
                          <span className="cell-sub">{student.registerNumber || '—'} · {student.email || '—'}</span>
                        </span>
                      </div>
                    </td>
                    <td><span className="cell-main !font-semibold">{student.department || '—'}</span></td>
                    <td className="cell-num font-bold">{student.cgpa ?? '—'}</td>
                    <td className="cell-num">{student.backlogs ?? '—'}</td>
                    <td className="cell-num">{student.graduationYear ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}><Button variant="ghost" size="sm" onClick={() => viewStudentRegistrations(student.name)}>View ({registered.filter(r => r.studentId === student.id).length})</Button></td>
                  </tr>
                ))}
              </tbody>
            </table></div></div>
          )}
        </>
      )}

      {tab === 'registered' && (
        <>
          <div className="surface p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2"><Field label="Search"><div className="input-icon-wrap"><Search size={16} className="icon-left" /><Input placeholder="Student, reg. no, company…" value={regSearch} onChange={e => setRegSearch(e.target.value)} /></div></Field></div>
            <Field label="Department"><Select value={regDept} onChange={e => setRegDept(e.target.value)}><option value="">All</option>{regDepartments.map(d => <option key={d} value={d}>{d}</option>)}</Select></Field>
            <Field label="Company"><Select value={regCompany} onChange={e => setRegCompany(e.target.value)}><option value="">All</option>{regCompanies.map(c => <option key={c} value={c}>{c}</option>)}</Select></Field>
            <Field label="Status"><Select value={regStatus} onChange={e => setRegStatus(e.target.value)}><option value="">All</option>{regStatuses.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field label="Sort"><Select value={sortOrder} onChange={e => setSortOrder(e.target.value)}><option value="desc">Newest first</option><option value="asc">Oldest first</option></Select></Field>
            <div className="lg:col-span-6 flex justify-end"><ExportButtons data={filteredRegistered} filename="registered-students" /></div>
          </div>
          {filteredRegistered.length === 0 ? <NoResults onClear={() => { setRegSearch(''); setRegDept(''); setRegCompany(''); setRegStatus(''); setRegDrive('') }} /> : (
            <div className="table-shell"><div className="table-scroll"><table className="tablex tablex-fixed" style={{ minWidth: 820 }}>
              <colgroup>
                <col />
                <col style={{ width: '26%' }} />
                <col style={{ width: 128 }} />
                <col style={{ width: 118 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead><tr><th>Student</th><th>Company</th><th>Eligibility</th><th>Status</th><th>Registered</th></tr></thead>
              <tbody>
                {filteredRegistered.map(row => (
                  <tr key={row.registrationId} onClick={() => setSelected(row)} className="cursor-pointer">
                    <td><div className="flex items-center gap-2.5 min-w-0"><Avatar name={row.studentName} size={32} /><span className="min-w-0 flex-1"><span className="cell-main !text-brand-700">{row.studentName || '—'}</span><span className="cell-sub">{row.registerNumber || '—'} · CGPA {row.cgpa ?? '—'}</span></span></div></td>
                    <td>
                      <div className="company-cell">
                        <CompanyLogo name={row.company} size={32} />
                        <span className="company-cell-text">
                          <span className="cell-main">{row.company || '—'}</span>
                          <span className="cell-sub">{row.jobRole || '—'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="badge-cell"><StatusBadge status={row.eligibilityStatus} /></td>
                    <td className="badge-cell"><StatusBadge status={row.applicationStatus} /></td>
                    <td className="cell-num text-slate-500">{formatDate(row.registrationDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div></div>
          )}
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.studentName} subtitle={`${selected?.registerNumber} · ${selected?.email}`} wide
        footer={<>
          <Button variant="secondary" size="sm" loading={acting} onClick={() => updateStatus(selected.registrationId, 'SHORTLISTED')}><CheckCircle2 size={15} /> Shortlist</Button>
          <Button variant="success" size="sm" loading={acting} onClick={() => updateStatus(selected.registrationId, 'SELECTED')}><Trophy size={15} /> Select</Button>
          <Button variant="danger" size="sm" loading={acting} onClick={() => updateStatus(selected.registrationId, 'REJECTED')}><XCircle size={15} /> Reject</Button>
        </>}>
        {selected && (
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="font-bold mb-2">Academics</h4>
              <p className="text-slate-600">Dept: <strong className="text-slate-900">{selected.department}</strong> · Grad <strong className="text-slate-900">{selected.graduationYear}</strong></p>
              <p className="text-slate-600 mt-1">CGPA <strong className="text-slate-900">{selected.cgpa}</strong> · Backlogs <strong className="text-slate-900">{selected.backlogs}</strong></p>
              <div className="mt-2"><SkillChips skills={selected.skills || []} /></div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="font-bold mb-2">Application</h4>
              <p className="text-slate-600">{selected.company} · {selected.jobRole}</p>
              <p className="text-slate-600 mt-1">Drive: {formatDate(selected.driveDate)} · Applied: {formatDate(selected.registrationDate)}</p>
              <div className="mt-2 flex gap-1.5"><StatusBadge status={selected.eligibilityStatus} /><StatusBadge status={selected.applicationStatus} /></div>
              {(selected.eligibilityReasons || []).length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-red-700">{selected.eligibilityReasons.map((r, i) => <li key={i} className="bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">{r.message}</li>)}</ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
