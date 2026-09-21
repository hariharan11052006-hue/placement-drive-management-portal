import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, Bell } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext'
import { PageHeader, Button, EmptyState } from '../components/ui'

const TYPE_TONE = {
  new_drive: 'bg-brand-50 text-brand-700 border-brand-100',
  application_submitted: 'bg-slate-100 text-slate-700 border-slate-200',
  shortlisted: 'bg-amber-50 text-amber-700 border-amber-100',
  selected: 'bg-green-50 text-green-700 border-green-100',
  rejected: 'bg-red-50 text-red-700 border-red-100',
  schedule_created: 'bg-violet-50 text-violet-700 border-violet-100',
  schedule_changed: 'bg-violet-50 text-violet-700 border-violet-100',
  drive_cancelled: 'bg-red-50 text-red-700 border-red-100',
}

export default function StudentNotifications() {
  const { notifications, markAsRead, markAllAsRead, fetchNotifications, unreadCount } = useNotifications()
  const navigate = useNavigate()

  React.useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const openNotif = (n) => {
    markAsRead(n.id)
    if (n.link) navigate(n.link)
    else if (n.driveId) navigate(`/student/drives/${n.driveId}`)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
        actions={unreadCount > 0 ? <Button variant="secondary" size="sm" onClick={markAllAsRead}>Mark all read</Button> : null}
      />
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={26} />} title="No notifications yet" subtitle="New drives, shortlists, selections and schedule changes will land here." />
      ) : (
        <div className="space-y-2.5">
          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => openNotif(n)}
              className={`w-full text-left surface surface-hover p-4 flex gap-3.5 ${!n.read ? '!border-brand-200 !bg-brand-50/40' : ''}`}
            >
              <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${TYPE_TONE[n.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                <BellRing size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{n.title || n.type}</span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-brand-600" aria-label="Unread" />}
                </span>
                <span className="block text-sm text-slate-600 mt-0.5">{n.message}</span>
                <span className="block text-xs text-slate-400 mt-1 tabular-nums">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
