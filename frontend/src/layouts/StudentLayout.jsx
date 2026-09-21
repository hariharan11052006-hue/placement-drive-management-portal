import React, { useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from '../components/NotificationBell'
import { LayoutDashboard, Briefcase, ClipboardList, UserRound, CalendarDays, Bell, LogOut, Menu, X, Sparkles } from 'lucide-react'

const links = [
  { to: '/student/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/student/drives', label: 'Find Drives', icon: <Briefcase size={18} /> },
  { to: '/student/applications', label: 'My Applications', icon: <ClipboardList size={18} /> },
  { to: '/student/schedules', label: 'Schedules', icon: <CalendarDays size={18} /> },
  { to: '/student/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { to: '/student/profile', label: 'My Profile', icon: <UserRound size={18} /> },
]

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex flex-col h-full">
      <Link to="/student/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-2 py-1 mb-5">
        <span className="w-10 h-10 rounded-xl bg-white text-emerald-800 font-extrabold flex items-center justify-center text-lg shadow">P</span>
        <span className="leading-tight">
          <span className="block font-extrabold text-white text-[15px]">PlacePro</span>
          <span className="block text-[11px] font-medium text-emerald-100">Student Portal</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {links.map(item => (
          <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => `side-link ${isActive ? 'active side-link-student' : ''}`}>
            {item.icon}<span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 rounded-xl bg-white/10 border border-white/10 p-3 text-xs text-emerald-50">
        <p className="font-bold text-white text-[13px] flex items-center gap-1.5"><Sparkles size={15} /> Tip</p>
        <p className="mt-1 text-emerald-100">Complete your profile to unlock more eligible drives.</p>
      </div>
    </div>
  )
}

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const crumb = location.pathname.split('/').filter(Boolean).map(s => s.replace(/-/g, ' ')).join(' / ')

  return (
    <div className="app-shell lg:flex">
      <aside className="hidden lg:flex w-[264px] shrink-0 flex-col bg-gradient-to-b from-[#064e3b] via-[#047857] to-[#059669] p-4 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="anim-pop absolute left-0 top-0 bottom-0 w-[280px] bg-gradient-to-b from-[#064e3b] to-[#059669] p-4 overflow-y-auto">
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
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 capitalize truncate">{crumb || 'student'}</p>
              <h2 className="font-extrabold text-slate-900 leading-tight truncate">Student Portal</h2>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <span className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                  {(user?.email?.[0] || 'S').toUpperCase()}
                </span>
                <span className="leading-tight hidden md:block">
                  <span className="block text-[13px] font-bold text-slate-900 max-w-[160px] truncate">{user?.email}</span>
                  <span className="block text-[11px] text-slate-500">Student</span>
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
