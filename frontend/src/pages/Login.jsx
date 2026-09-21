import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, AlertCircle, Eye, EyeOff, GraduationCap, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button, Field, Input } from '../components/ui'

export function loginErrorMessage(err) {
  if (err?.response) {
    if ([400, 401, 403].includes(err.response.status)) return 'Invalid email or password.'
    return err.response.data?.message || 'Invalid email or password.'
  }
  return 'Unable to connect to server. Please try again.'
}

export function LoginForm({ title, subtitle, accent = 'blue', adminOnly = false, showRegisterLink = false }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isGreen = accent === 'green'

  React.useEffect(() => {
    if (location.state?.email) setEmail(location.state.email)
  }, [location.state])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Please enter email and password.'); return }
    setLoading(true)
    try {
      const result = await login(email.trim(), password)
      const role = result?.role || 'student'
      if (adminOnly && role !== 'admin') {
        logout()
        setError('Access denied. Please use Student Login.')
        return
      }
      navigate(role === 'admin' ? '/admin/dashboard' : '/student/dashboard')
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className={`hidden lg:flex flex-col justify-between p-10 text-white relative overflow-hidden ${isGreen ? 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700' : 'bg-gradient-to-br from-[#1e2f8a] via-[#2549eb] to-[#1d3ad8]'}`}>
        <Link to="/" className="flex items-center gap-2.5 text-white">
          <span className="w-10 h-10 rounded-xl bg-white font-extrabold flex items-center justify-center text-lg text-slate-900">P</span>
          <span className="leading-tight">
            <span className="block font-extrabold">PlacePro</span>
            <span className="block text-xs text-white/70">Placement Portal</span>
          </span>
        </Link>
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-white/15 border border-white/20 rounded-full px-3 py-1.5">
            {isGreen ? <GraduationCap size={14} /> : <ShieldCheck size={14} />} {isGreen ? 'For Students' : 'For Placement Cell'}
          </p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight leading-tight">
            {isGreen ? 'Find drives you are actually eligible for.' : 'Run the entire placement season with confidence.'}
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-white/85">
            {(isGreen
              ? ['Instant eligibility with skill matching', 'One-click apply with deadline guards', 'Track shortlist → selection live']
              : ['Single eligibility engine everywhere', 'Publish, close and shortlist in clicks', 'Reports, schedules and activity timeline']
            ).map(t => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-white" /> {t}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/60">© 2026 PlacePro · Secure JWT authentication</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-4 md:p-8 bg-slate-100">
        <div className="surface w-full max-w-md p-7 md:p-8 anim-pop">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-5"><ArrowLeft size={14} /> Back to home</Link>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isGreen ? 'bg-emerald-600 text-white' : 'bg-brand-600 text-white'}`}>
            {isGreen ? <GraduationCap size={22} /> : <ShieldCheck size={22} />}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1 mb-5">{subtitle}</p>}
          {!subtitle && <div className="mb-5" />}
          {location.state?.message && (
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-3.5 py-2.5 mb-4">{location.state.message}</div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3.5 py-2.5 mb-4 flex items-center gap-2">
              <AlertCircle size={17} className="shrink-0" /> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label="Email" required>
              <div className="input-icon-wrap">
                <Mail size={17} className="icon-left" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@college.edu" required autoComplete="email" data-error={!!error} />
              </div>
            </Field>
            <Field label="Password" required>
              <div className="input-icon-wrap">
                <Lock size={17} className="icon-left" />
                <Input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" className="pr-11" data-error={!!error} />
                <button type="button" onClick={() => setShowPw(v => !v)} className="icon-right-btn text-slate-400 hover:text-slate-700 p-1" aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>
            <Button type="submit" loading={loading} className="w-full" variant={isGreen ? 'success' : 'primary'}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          {showRegisterLink && (
            <p className="mt-4 text-center text-sm text-slate-600">
              New Student? <Link to="/student/register" className="text-emerald-700 font-bold hover:underline">Create account</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return <LoginForm title="Welcome back" subtitle="Sign in to continue to your placement workspace." showRegisterLink />
}
