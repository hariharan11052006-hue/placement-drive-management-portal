import React, { useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../components/NotificationBell'
import { LayoutDashboard, Briefcase, Building2, Users, ClipboardList, CalendarDays, BarChart3, ScrollText, LogOut, Menu, X, GraduationCap } from 'lucide-react'

const groups = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    label: 'Placements',
    items: [
      { to: '/admin/drives', label: 'Drives', icon: <Briefcase size={18} /> },
      { to: '/admin/companies', label: 'Companies', icon: <Building2 size={18} /> },
      { to: '/admin/registrations', label: 'Registrations', icon: <ClipboardList size={18} /> },
      { to: '/admin/students', label: 'Students', icon: <Users size={18} /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/schedules', label: 'Schedules', icon: <CalendarDays size={18} /> },
      { to: '/admin/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
      { to: '/admin/activity-log', label: 'Activity Log', icon: <ScrollText size={18} /> },
    ],
  },
]

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex flex-col h-full">
      <Link to="/admin/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-2 py-1 mb-5">
        <span className="w-10 h-10 rounded-xl bg-white text-brand-800 font-extrabold flex items-center justify-center text-lg shadow">P</span>
        <span className="leading-tight">
          <span className="block font-extrabold text-white text-[15px]">PlacePro</span>
          <span className="block text-[11px] font-medium text-indigo-200">Admin Console</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
        {groups.map(g => (
          <div key={g.label}>
            <p className="px-2 mb-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-300">{g.label}</p>
            <div className="space-y-1">
              {g.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
                >
                  {item.icon}<span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-4 rounded-xl bg-white/10 border border-white/10 p-3 text-xs text-indigo-100">
        <p className="font-bold text-white text-[13px] flex items-center gap-1.5"><GraduationCap size={15} /> Placement season</p>
        <p className="mt-1 text-indigo-200">Publish drives, track eligibility and shortlist faster.</p>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const crumb = location.pathname.split('/').filter(Boolean).map(s => s.replace(/-/g, ' ')).join(' / ')

  return (
    <div className="app-shell lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[264px] shrink-0 flex-col bg-gradient-to-b from-[#1e2f8a] via-[#2339a8] to-[#1d3ad8] p-4 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="anim-pop absolute left-0 top-0 bottom-0 w-[280px] bg-gradient-to-b from-[#1e2f8a] to-[#1d3ad8] p-4 overflow-y-auto">
            <div className="flex justify-end mb-2">
              <button onClick={() => setMobileOpen(false)} className="text-white/80 hover:text-white p-1" aria-label="Close menu"><X size={22} /></button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-slate-200">
          <div className="px-4 md:px-8 py-3 flex items-center gap-3">
            <button className="lg:hidden btnx btnx-ghost btnx-sm" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 capitalize truncate">{crumb || 'admin'}</p>
              <h2 className="font-extrabold text-slate-900 leading-tight truncate">Admin Workspace</h2>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <span className="w-9 h-9 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center text-sm">
                  {(user?.email?.[0] || 'A').toUpperCase()}
                </span>
                <span className="leading-tight hidden md:block">
                  <span className="block text-[13px] font-bold text-slate-900 max-w-[160px] truncate">{user?.email}</span>
                  <span className="block text-[11px] text-slate-500">Administrator</span>
                </span>
              </div>
              <button onClick={logout} className="btnx btnx-ghost btnx-sm"><LogOut size={16} /><span className="hidden sm:inline">Logout</span></button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 max-w-[1200px] w-full mx-auto">
          <div className="page-wrap"><Outlet /></div>
        </main>
      </div>
    </div>
  )
}
