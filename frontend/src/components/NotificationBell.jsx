import React, { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext'
import { useNavigate } from 'react-router-dom'

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleEsc) }
  }, [])

  const go = (notif) => {
    markAsRead(notif.id)
    setOpen(false)
    if (notif.link) navigate(notif.link)
    else if (notif.driveId) navigate(`/student/drives/${notif.driveId}`)
    else navigate('/student/notifications')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:shadow-card transition flex items-center justify-center"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-extrabold flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="anim-pop absolute right-0 mt-2 w-[340px] max-w-[90vw] surface overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <p className="font-extrabold text-sm text-slate-900">Notifications {unreadCount > 0 && <span className="ml-1 badgex badge-red">{unreadCount} new</span>}</p>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-bold text-brand-700 hover:underline inline-flex items-center gap-1"><CheckCheck size={13} /> Mark all read</button>
            )}
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {notifications.length === 0 && <p className="p-6 text-sm text-slate-500 text-center">You're all caught up. 🎉</p>}
            {notifications.slice(0, 12).map(notif => (
              <button key={notif.id} onClick={() => go(notif)} className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition flex gap-3 ${!notif.read ? 'bg-brand-50/50' : ''}`}>
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.read ? 'bg-brand-600' : 'bg-slate-200'}`} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-slate-900 truncate">{notif.title || notif.type}</span>
                  <span className="block text-[13px] text-slate-600 line-clamp-2">{notif.message}</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5 tabular-nums">{notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}</span>
                </span>
              </button>
            ))}
          </div>
          <button onClick={() => { setOpen(false); navigate('/student/notifications') }} className="w-full text-center text-xs font-bold text-brand-700 hover:bg-slate-50 py-2.5 border-t border-slate-100">
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}
