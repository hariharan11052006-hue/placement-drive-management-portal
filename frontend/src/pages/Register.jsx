import React, { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, CheckCircle2, ArrowLeft, UserRound, GraduationCap, School, Code2, KeyRound, X } from 'lucide-react'
import { Button, Field, Input, Select } from '../components/ui'

const DEPARTMENTS = ['Computer Science', 'Information Technology', 'Electronics', 'Electrical', 'Mechanical', 'Civil', 'MBA', 'Commerce', 'Other']

function Section({ icon, title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center">{icon}</span>
        <div>
          <h3 className="font-bold text-slate-900 text-[15px]">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

export default function Register() {
  const [form, setForm] = useState({
    name: '', registerNumber: '', email: '', phone: '', password: '', confirmPassword: '',
    department: '', graduationYear: '', cgpa: '', backlogs: '',
    tenthPercentage: '', twelfthPercentage: '', skills: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const skillChips = useMemo(() => String(form.skills || '').split(',').map(s => s.trim()).filter(Boolean), [form.skills])
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const validate = () => {
    const required = ['name', 'registerNumber', 'email', 'phone', 'password', 'confirmPassword', 'department', 'graduationYear', 'cgpa', 'backlogs']
    for (const key of required) {
      if (!String(form[key] ?? '').trim()) return 'Please fill all required fields.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.'
    if (form.password.length < 6) return 'Password must be at least 6 characters.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    const cgpa = parseFloat(form.cgpa)
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) return 'Please enter a valid CGPA (0 - 10).'
    const backlogs = parseInt(form.backlogs)
    if (isNaN(backlogs) || backlogs < 0) return 'Please enter a valid number of backlogs.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setSubmitting(true)
    try {
      const { confirmPassword, ...payload } = form
      await register({
        ...payload,
        graduationYear: parseInt(payload.graduationYear),
        cgpa: parseFloat(payload.cgpa),
        backlogs: parseInt(payload.backlogs),
        tenthPercentage: payload.tenthPercentage === '' ? undefined : parseFloat(payload.tenthPercentage),
        twelfthPercentage: payload.twelfthPercentage === '' ? undefined : parseFloat(payload.twelfthPercentage)
      })
      setSuccess('Registration successful! Redirecting to login…')
      setTimeout(() => navigate('/student/login', { state: { email: form.email, message: 'Registration successful! Please login.' } }), 1200)
    } catch (err) {
      if (!err?.response) setError('Unable to connect to server. Please try again.')
      else setError(err.response.data?.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-5"><ArrowLeft size={14} /> Back to home</Link>
        <div className="text-center mb-6">
          <span className="inline-flex w-12 h-12 rounded-2xl bg-emerald-600 text-white items-center justify-center mb-3"><UserRound size={22} /></span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Create your student account</h1>
          <p className="text-sm text-slate-500 mt-1">Onboarding takes a minute — eligibility needs accurate academics.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2"><AlertCircle size={17} className="shrink-0" /> {error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2"><CheckCircle2 size={17} className="shrink-0" /> {success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Section icon={<UserRound size={18} />} title="Personal information" subtitle="How the placement cell identifies you">
            <Field label="Full name" required><Input name="name" value={form.name} onChange={handleChange} placeholder="Aarav Sharma" required /></Field>
            <Field label="Register number" required><Input name="registerNumber" value={form.registerNumber} onChange={handleChange} placeholder="2024CSE001" required /></Field>
            <Field label="Email" required><Input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@college.edu" required /></Field>
            <Field label="Phone" required><Input name="phone" value={form.phone} onChange={handleChange} placeholder="98765 43210" required /></Field>
          </Section>

          <Section icon={<GraduationCap size={18} />} title="Academic information" subtitle="Used directly by the eligibility engine">
            <Field label="Department" required>
              <Select name="department" value={form.department} onChange={handleChange} required>
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Graduation year" required><Input type="number" name="graduationYear" value={form.graduationYear} onChange={handleChange} placeholder="2026" min={2000} max={2100} required /></Field>
            <Field label="CGPA (0 – 10)" required><Input type="number" name="cgpa" value={form.cgpa} onChange={handleChange} placeholder="8.2" min={0} max={10} step={0.1} required /></Field>
            <Field label="Backlogs" required><Input type="number" name="backlogs" value={form.backlogs} onChange={handleChange} placeholder="0" min={0} step={1} required /></Field>
          </Section>

          <Section icon={<School size={18} />} title="School information" subtitle="Optional, but some drives require it">
            <Field label="10th percentage"><Input type="number" name="tenthPercentage" value={form.tenthPercentage} onChange={handleChange} placeholder="85.0" min={0} max={100} step={0.1} /></Field>
            <Field label="12th percentage"><Input type="number" name="twelfthPercentage" value={form.twelfthPercentage} onChange={handleChange} placeholder="88.5" min={0} max={100} step={0.1} /></Field>
          </Section>

          <Section icon={<Code2 size={18} />} title="Skills" subtitle="Comma separated — powers skill matching">
            <div className="md:col-span-2">
              <Field label="Skills">
                <Input name="skills" value={form.skills} onChange={handleChange} placeholder="Java, Python, React, SQL" />
              </Field>
              {skillChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {skillChips.map(s => (
                    <span key={s} className="chip chip-ok">{s}
                      <button type="button" aria-label={`Remove ${s}`} onClick={() => setForm({ ...form, skills: skillChips.filter(x => x !== s).join(', ') })} className="text-green-800 hover:text-green-900"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <Section icon={<KeyRound size={18} />} title="Account information" subtitle="Use a password with 6+ characters">
            <Field label="Password" required><Input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" minLength={6} required autoComplete="new-password" /></Field>
            <Field label="Confirm password" required><Input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" required autoComplete="new-password" /></Field>
          </Section>

          <Button type="submit" loading={submitting} variant="success" size="lg" className="w-full">
            {submitting ? 'Creating account…' : 'Create student account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account? <Link to="/student/login" className="text-emerald-700 font-bold hover:underline">Student Login</Link>
        </p>
      </div>
    </div>
  )
}
