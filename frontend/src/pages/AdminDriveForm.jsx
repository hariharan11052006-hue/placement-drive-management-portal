import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api, { getErrorMessage } from '../services/api'
import { Save, ArrowLeft, Wand2, Building2, SlidersHorizontal, Code2, CalendarDays, ListChecks } from 'lucide-react'
import { PageHeader, SectionCard, Button, Field, Input, Select, Textarea, LoadingState } from '../components/ui'

const skillCountFromText = (text) => String(text || '').split(/[,;|/\r\n]+/).map(s => s.trim()).filter(Boolean).length

const emptyForm = {
  company: '', role: '', description: '', location: '', driveDate: '', deadline: '', postedDate: '',
  salary: '', skills: '', minimumSkillsRequired: '', minCgpa: '', maxBacklogs: '',
  minTenthPercentage: '', minTwelfthPercentage: '',
  eligibleDepartments: '', eligibleGraduationYears: '',
  openings: '', maxApplicants: '', workMode: 'On-site', jobType: 'Full-time',
  selectionProcess: '', status: 'draft'
}

export default function AdminDriveForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [form, setForm] = useState(emptyForm)
  const [companies, setCompanies] = useState([])
  const [minSkillsTouched, setMinSkillsTouched] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/companies').then(res => setCompanies(res.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) { setLoading(false); return }
    api.get(`/drives/${id}`)
      .then(res => {
        const d = res.data
        const skills = (d.requiredSkills && d.requiredSkills.length ? d.requiredSkills : d.skills) || []
        const gradYears = d.eligibleGraduationYears && d.eligibleGraduationYears.length ? d.eligibleGraduationYears : (d.graduationYear !== null && d.graduationYear !== undefined && d.graduationYear !== '' ? (Array.isArray(d.graduationYear) ? d.graduationYear : [d.graduationYear]) : [])
        const depts = d.eligibleDepartments || d.departments || []
        setForm({
          company: d.company || '', role: d.role || '', description: d.description || '', location: d.location || '',
          driveDate: (d.driveDate || '').slice(0, 10), deadline: (d.deadline || '').slice(0, 10), postedDate: (d.postedDate || d.createdAt || '').slice(0, 10),
          salary: d.salary || d.package || '', skills: skills.join(', '),
          minimumSkillsRequired: d.minimumSkillsRequired !== undefined && d.minimumSkillsRequired !== null && d.minimumSkillsRequired !== '' ? String(d.minimumSkillsRequired) : String(skills.length || 1),
          minCgpa: d.minCgpa ?? '', maxBacklogs: d.maxBacklogs ?? '',
          minTenthPercentage: d.minTenthPercentage ?? '', minTwelfthPercentage: d.minTwelfthPercentage ?? '',
          eligibleDepartments: Array.isArray(depts) ? depts.join(', ') : String(depts || ''),
          eligibleGraduationYears: Array.isArray(gradYears) ? gradYears.join(', ') : String(gradYears || ''),
          openings: d.openings ?? '', maxApplicants: d.maxApplicants ?? d.maximumApplicants ?? '',
          workMode: d.workMode || 'On-site', jobType: d.jobType || 'Full-time',
          selectionProcess: Array.isArray(d.selectionProcess) ? d.selectionProcess.join(', ') : (Array.isArray(d.recruitmentProcess) ? d.recruitmentProcess.join(', ') : String(d.selectionProcess || d.recruitmentProcess || '')),
          status: String(d.status || 'draft').toLowerCase()
        })
        setMinSkillsTouched(true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    let next = { ...form, [name]: value }
    if (name === 'skills' && !minSkillsTouched) {
      const count = skillCountFromText(value)
      next.minimumSkillsRequired = count >= 1 ? String(count) : ''
    }
    if (name === 'minimumSkillsRequired') setMinSkillsTouched(true)
    if (name === 'company') {
      const comp = companies.find(c => c.name === value)
      if (comp) {
        if (!next.description && comp.description) next.description = comp.description
        if (!next.location && comp.location) next.location = comp.location
        if ((!next.skills || !next.skills.trim()) && comp.skills && comp.skills.length) {
          next.skills = comp.skills.join(', ')
          if (!minSkillsTouched) next.minimumSkillsRequired = String(comp.skills.length)
        }
      }
    }
    setForm(next)
  }

  const handleAutoDetect = async () => {
    setDetecting(true)
    try {
      const res = await api.post('/skills/normalize', { skills: form.skills })
      setForm(f => ({ ...f, skills: (res.data.skills || []).join(', ') }))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not auto-detect skills'))
    } finally {
      setDetecting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.company.trim() || !form.role.trim()) { setError('Company and role are required.'); return }
    const skillsList = String(form.skills || '').split(/[,;|/\r\n]+/).map(s => s.trim()).filter(Boolean)
    const gradYears = String(form.eligibleGraduationYears || '').split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n))
    const data = {
      company: form.company.trim(),
      role: form.role.trim(),
      description: form.description,
      location: form.location,
      driveDate: form.driveDate || null,
      deadline: form.deadline || null,
      postedDate: form.postedDate || null,
      salary: form.salary,
      package: form.salary,
      skills: skillsList,
      requiredSkills: skillsList,
      minimumSkillsRequired: form.minimumSkillsRequired === '' || form.minimumSkillsRequired === undefined
        ? (skillsList.length || 1)
        : parseInt(form.minimumSkillsRequired, 10),
      minCgpa: form.minCgpa === '' ? null : parseFloat(form.minCgpa),
      maxBacklogs: form.maxBacklogs === '' ? null : parseInt(form.maxBacklogs, 10),
      minTenthPercentage: form.minTenthPercentage === '' ? null : parseFloat(form.minTenthPercentage),
      minTwelfthPercentage: form.minTwelfthPercentage === '' ? null : parseFloat(form.minTwelfthPercentage),
      eligibleDepartments: String(form.eligibleDepartments || '').split(',').map(s => s.trim()).filter(Boolean),
      eligibleGraduationYears: gradYears,
      graduationYear: gradYears.length === 1 ? gradYears[0] : (gradYears.length > 1 ? gradYears : null),
      openings: form.openings === '' ? null : parseInt(form.openings, 10),
      maxApplicants: form.maxApplicants === '' ? null : parseInt(form.maxApplicants, 10),
      workMode: form.workMode,
      jobType: form.jobType,
      selectionProcess: String(form.selectionProcess || '').split(',').map(s => s.trim()).filter(Boolean),
      recruitmentProcess: String(form.selectionProcess || '').split(',').map(s => s.trim()).filter(Boolean),
      status: form.status
    }
    setSaving(true)
    try {
      if (isEdit) await api.put(`/drives/${id}`, data)
      else await api.post('/drives', data)
      navigate('/admin/drives')
    } catch (err) {
      setError(getErrorMessage(err, 'Error saving drive'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState lines={6} title="Loading drive…" />

  const requiredCount = skillCountFromText(form.skills)
  const rawMin = form.minimumSkillsRequired === '' || form.minimumSkillsRequired === undefined ? requiredCount : parseInt(form.minimumSkillsRequired, 10)
  const effectiveMin = requiredCount === 0 ? 0 : Math.max(1, Math.min(isNaN(rawMin) ? requiredCount : rawMin, Math.max(1, requiredCount)))

  return (
    <div>
      <PageHeader
        eyebrow={isEdit ? 'Edit drive' : 'New drive'}
        title={isEdit ? 'Edit placement drive' : 'Create placement drive'}
        subtitle="All changes go through backend validation. Drafts stay hidden from students."
        actions={<Link to="/admin/drives" className="btnx btnx-ghost btnx-sm"><ArrowLeft size={15} /> Back to drives</Link>}
      />
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <SectionCard title="Basic information" subtitle="What students see first">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Company" required hint="Selecting an existing company prefills empty fields only.">
              <Input name="company" value={form.company} onChange={handleChange} list="company-list" required placeholder="e.g. TCS" />
              <datalist id="company-list">{companies.map(c => <option key={c.id} value={c.name} />)}</datalist>
            </Field>
            <Field label="Job role" required><Input name="role" value={form.role} onChange={handleChange} required placeholder="e.g. Software Developer" /></Field>
            <div className="md:col-span-2"><Field label="Job description"><Textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Responsibilities, tech stack, expectations…" /></Field></div>
            <Field label="Location"><Input name="location" value={form.location} onChange={handleChange} placeholder="Chennai / Remote" /></Field>
            <Field label="Package / Salary"><Input name="salary" value={form.salary} onChange={handleChange} placeholder="₹7 LPA" /></Field>
            <Field label="Work mode">
              <Select name="workMode" value={form.workMode} onChange={handleChange}>
                <option>On-site</option><option>Remote</option><option>Hybrid</option><option>Internship</option>
              </Select>
            </Field>
            <Field label="Job type">
              <Select name="jobType" value={form.jobType} onChange={handleChange}>
                <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Temporary</option>
              </Select>
            </Field>
            <Field label="Openings"><Input type="number" min={0} name="openings" value={form.openings} onChange={handleChange} placeholder="10" /></Field>
            <Field label="Status">
              <Select name="status" value={form.status} onChange={handleChange}>
                <option value="draft">Draft — hidden from students</option>
                <option value="published">Published — open for applications</option>
                <option value="closed">Closed — no new applications</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Eligibility criteria" subtitle="Single backend engine evaluates all of these">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Min CGPA (0–10)" hint="Empty = no requirement"><Input type="number" step={0.1} min={0} max={10} name="minCgpa" value={form.minCgpa} onChange={handleChange} placeholder="7.0" /></Field>
            <Field label="Max backlogs" hint="Empty = no requirement"><Input type="number" min={0} name="maxBacklogs" value={form.maxBacklogs} onChange={handleChange} placeholder="0" /></Field>
            <Field label="Eligible departments" hint="Comma separated · empty = all"><Input name="eligibleDepartments" value={form.eligibleDepartments} onChange={handleChange} placeholder="CSE, IT, ECE" /></Field>
            <Field label="Eligible graduation years" hint="Comma separated · empty = all"><Input name="eligibleGraduationYears" value={form.eligibleGraduationYears} onChange={handleChange} placeholder="2025, 2026" /></Field>
            <Field label="Min 10th % (optional)"><Input type="number" step={0.1} min={0} max={100} name="minTenthPercentage" value={form.minTenthPercentage} onChange={handleChange} /></Field>
            <Field label="Min 12th % (optional)"><Input type="number" step={0.1} min={0} max={100} name="minTwelfthPercentage" value={form.minTwelfthPercentage} onChange={handleChange} /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Skills" subtitle="ANY-N matching — e.g. any 2 of Java, React, Python, SQL">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
            <Field label="Required skills" hint="Comma separated. Aliases and case are normalized by the backend.">
              <div className="flex gap-2">
                <Input name="skills" value={form.skills} onChange={handleChange} placeholder="Java, Python, React, SQL" className="flex-1" />
                <Button type="button" variant="secondary" size="sm" onClick={handleAutoDetect} loading={detecting}><Wand2 size={15} /> Auto</Button>
              </div>
            </Field>
            <Field label="Minimum matching (N)" hint={`Student needs ${effectiveMin} of ${requiredCount}.`}>
              <Input type="number" min={1} name="minimumSkillsRequired" value={form.minimumSkillsRequired} onChange={e => { setMinSkillsTouched(true); handleChange({ target: { name: 'minimumSkillsRequired', value: e.target.value } }) }} />
            </Field>
          </div>
          <div className="mt-3 rounded-xl bg-brand-50 border border-brand-100 text-brand-800 text-sm px-4 py-3">
            Eligibility rule: <strong>Any {effectiveMin} of {requiredCount}</strong> — Java + React ✓ eligible · only Java ✕ not eligible.
          </div>
        </SectionCard>

        <SectionCard title="Schedule & selection" subtitle="Dates students see on cards and details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Posted date"><Input type="date" name="postedDate" value={form.postedDate} onChange={handleChange} /></Field>
            <Field label="Drive date"><Input type="date" name="driveDate" value={form.driveDate} onChange={handleChange} /></Field>
            <Field label="Application deadline"><Input type="date" name="deadline" value={form.deadline} onChange={handleChange} /></Field>
            <Field label="Max applicants (optional)" hint="Backend blocks beyond this."><Input type="number" min={1} name="maxApplicants" value={form.maxApplicants} onChange={handleChange} /></Field>
            <div className="md:col-span-2"><Field label="Selection process" hint="Comma separated rounds"><Input name="selectionProcess" value={form.selectionProcess} onChange={handleChange} placeholder="Aptitude, Technical, HR" /></Field></div>
          </div>
        </SectionCard>

        <div className="flex gap-2.5 sticky bottom-4 surface p-3">
          <Button type="submit" loading={saving} className="flex-1 md:flex-none md:px-10"><Save size={16} /> {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create drive'}</Button>
          <Link to="/admin/drives" className="btnx btnx-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
