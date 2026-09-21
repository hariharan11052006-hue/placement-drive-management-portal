import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, BellRing, Building2, CalendarDays, ClipboardList, GraduationCap, ShieldCheck, Sparkles, UserPlus, ChevronRight } from 'lucide-react'
import api from '../services/api'
import CompanyLogo from '../components/CompanyLogo'

const features = [
  { icon: <BadgeCheck size={20} />, title: 'Smart Eligibility', text: 'CGPA, backlogs, department, graduation year and skills checked automatically from one backend engine.', tone: 'bg-green-50 text-green-700 border-green-100' },
  { icon: <Building2 size={20} />, title: 'Centralized Drives', text: 'Every company, role, package, deadline and selection round in one searchable hub.', tone: 'bg-brand-50 text-brand-700 border-brand-100' },
  { icon: <ClipboardList size={20} />, title: 'Application Tracking', text: 'Applied → Shortlisted → Selected with a clear timeline for every student.', tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  { icon: <BellRing size={20} />, title: 'Notifications', text: 'New drives, shortlists, selections and schedule changes delivered instantly.', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  { icon: <CalendarDays size={20} />, title: 'Schedule Management', text: 'Aptitude, technical, coding and interview rounds with venue and meeting links.', tone: 'bg-sky-50 text-sky-700 border-sky-100' },
  { icon: <GraduationCap size={20} />, title: 'Student Profiles', text: 'Academic history, skills and placement statistics in a polished profile.', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
]

export default function Landing() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    // Public stats would need auth; try drives list if public, else show tasteful defaults
    api.get('/drives').then(res => {
      const drives = Array.isArray(res.data) ? res.data : []
      const companies = new Set(drives.map(d => d.company)).size
      setStats([
        { label: 'Placement Drives', value: String(drives.length || '12+') },
        { label: 'Companies', value: String(companies || '8+') },
        { label: 'Students', value: '500+' },
        { label: 'Applications', value: '1k+' },
      ])
    }).catch(() => {
      setStats([
        { label: 'Students', value: '500+' },
        { label: 'Companies', value: '40+' },
        { label: 'Placement Drives', value: '120+' },
        { label: 'Applications', value: '5k+' },
      ])
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3.5 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-brand-600 text-white font-extrabold flex items-center justify-center">P</span>
            <span className="leading-tight">
              <span className="block font-extrabold text-slate-900">PlacePro</span>
              <span className="block text-[11px] font-semibold text-slate-500 -mt-0.5">Placement Portal</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1.5 text-sm">
            <Link to="/student/login" className="btnx btnx-ghost btnx-sm hidden sm:inline-flex">Student Login</Link>
            <Link to="/admin/login" className="btnx btnx-ghost btnx-sm hidden sm:inline-flex">Admin Login</Link>
            <Link to="/student/register" className="btnx btnx-primary btnx-sm"><UserPlus size={15} /> Register</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-10 grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center">
          <div className="page-wrap">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5">
              <Sparkles size={13} /> Placement Drive Management Portal
            </p>
            <h1 className="mt-4 text-4xl md:text-[54px] leading-[1.05] font-extrabold tracking-tight text-slate-900">
              Connect students with their <span className="text-brand-600">next opportunity.</span>
            </h1>
            <p className="mt-4 text-slate-600 text-base md:text-lg max-w-xl">
              One premium workspace for drives, eligibility, applications, schedules and selections — built for placement cells and students.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/student/drives" className="btnx btnx-primary btnx-lg">Explore Drives <ArrowRight size={18} /></Link>
              <Link to="/student/login" className="btnx btnx-secondary btnx-lg"><GraduationCap size={18} /> Student Login</Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <Link to="/admin/login" className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-brand-700"><ShieldCheck size={15} /> Admin Login <ChevronRight size={14} /></Link>
              <span aria-hidden>·</span>
              <span>New here? <Link to="/student/register" className="font-semibold text-emerald-700 hover:underline">Create account</Link></span>
            </div>
            {/* Stats */}
            <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
              {(stats || []).map(s => (
                <div key={s.label} className="surface px-4 py-3">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{s.label}</dt>
                  <dd className="text-xl font-extrabold text-slate-900">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Visual: dashboard mock */}
          <div className="relative hidden lg:block" aria-hidden>
            <div className="surface p-5 anim-pop">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Placement overview</p>
                  <p className="font-extrabold text-slate-900">Good morning, Admin</p>
                </div>
                <span className="badgex badge-green">● Live</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[['Active drives', '24'], ['Eligible', '86%'], ['Selected', '132']].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-slate-500">{k}</p>
                    <p className="font-extrabold text-slate-900">{v}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2.5">
                {[
                  ['TCS', 'Software Developer · ₹7 LPA', 'Published'],
                  ['Infosys', 'Systems Engineer · ₹6 LPA', 'Published'],
                  ['Wipro', 'Project Engineer · ₹5.5 LPA', 'Draft'],
                ].map(([c, r, s]) => (
                  <div key={c} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 bg-white">
                    <CompanyLogo name={c} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900 truncate">{c}</span>
                      <span className="block text-xs text-slate-500 truncate">{r}</span>
                    </span>
                    <span className={`badgex ${s === 'Published' ? 'badge-green' : 'badge-gray'}`}>{s}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-sm">
                <span className="font-semibold">✓ Eligibility engine · CGPA + Skills + Dept</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pb-6 w-full">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Why this platform</p>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-5">Everything placements need, in one place</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.title} className="surface surface-hover p-5">
              <span className={`w-10 h-10 rounded-xl border inline-flex items-center justify-center mb-3 ${f.tone}`}>{f.icon}</span>
              <h3 className="font-bold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-8 w-full">
        <div className="rounded-2xl bg-slate-900 text-white p-8 md:p-10 flex flex-wrap items-center gap-6 overflow-hidden relative">
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">Ready to run placements like a product?</h3>
            <p className="text-slate-300 mt-2 text-sm md:text-base">Students register, check eligibility instantly, apply in one click. Admins publish and shortlist with confidence.</p>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <Link to="/student/register" className="btnx btnx-lg bg-white text-slate-900 hover:bg-slate-100">Get started <ArrowRight size={17} /></Link>
            <Link to="/student/login" className="btnx btnx-lg border border-white/25 text-white hover:bg-white/10">Student login</Link>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="font-bold text-slate-800">© 2026 PlacePro</span>
          <span>Placement Drive Management Portal</span>
          <span className="ml-auto flex gap-4">
            <Link to="/student/login" className="hover:text-slate-800">Student</Link>
            <Link to="/admin/login" className="hover:text-slate-800">Admin</Link>
            <Link to="/student/register" className="hover:text-slate-800">Register</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}
