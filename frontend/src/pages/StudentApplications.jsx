import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { getErrorMessage } from '../services/api'
import { ClipboardList, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { PageHeader, LoadingState, ErrorState, EmptyState, StatusBadge, Button, Modal } from '../components/ui'
import CompanyLogo from '../components/CompanyLogo'
import { formatDate } from '../utils/driveUtils'

const STEPS = ['Applied', 'Shortlisted', 'Interview / Test', 'Selected']

function Tracker({ status }) {
  const norm = String(status || '').toUpperCase()
  if (norm === 'REJECTED') {
    return (
      <div className="flex items-center gap-2 mt-4 text-sm font-bold text-red-700">
        <span className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center"><XCircle size={16} /></span>
        Applied → <span className="badgex badge-red">Rejected</span>
      </div>
    )
  }
  if (norm === 'WITHDRAWN') {
    return <p className="mt-4 text-sm font-bold text-slate-500">Application withdrawn.</p>
  }
  const stepIdx = norm === 'SELECTED' ? 3 : norm === 'SHORTLISTED' ? 1 : 0
  return (
    <div className="mt-4">
      <div className="flex items-center" aria-hidden>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <span className={`flex-1 h-1 mx-1 rounded-full ${i <= stepIdx ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
            <span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${i <= stepIdx ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {i < stepIdx ? <CheckCircle2 size={16} /> : i + 1}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className="flex mt-1.5">
        {STEPS.map((s, i) => (
          <span key={s} className={`flex-1 text-center text-[11px] font-bold ${i <= stepIdx ? 'text-emerald-700' : 'text-slate-400'}`}>{s}</span>
        ))}
      </div>
    </div>
  )
}

export default function StudentApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmWithdraw, setConfirmWithdraw] = useState(null)
  const [acting, setActing] = useState(false)

  const fetchApps = () => {
    setLoading(true)
    setError('')
    api.get('/applications')
      .then(res => { setApplications(res.data || []); setLoading(false) })
      .catch((err) => { setError(getErrorMessage(err, 'Could not load applications')); setLoading(false) })
  }

  useEffect(() => { fetchApps() }, [])

  const handleWithdraw = async () => {
    if (!confirmWithdraw) return
    setActing(true)
    try {
      await api.delete(`/registrations/${confirmWithdraw.id}`)
      setConfirmWithdraw(null)
      fetchApps()
    } catch (err) {
      alert(getErrorMessage(err, 'Withdraw failed'))
    } finally {
      setActing(false)
    }
  }

  if (loading) return <LoadingState lines={4} title="Loading applications…" />
  if (error) return <ErrorState message="Could not load applications" detail={error} onRetry={fetchApps} />

  return (
    <div>
      <PageHeader eyebrow="Tracker" title="My Applications" subtitle={`${applications.length} submitted · statuses update live`} />
      {applications.length === 0 ? (
        <EmptyState icon={<ClipboardList size={26} />} title="No applications yet" subtitle="Browse open drives and apply in one click." action={<Link to="/student/drives" className="btnx btnx-primary btnx-sm">Browse drives <ArrowRight size={14} /></Link>} />
      ) : (
        <div className="space-y-4">
          {applications.map(app => (
            <div key={app.id} className="surface p-5 md:p-6">
              <div className="flex flex-wrap items-start gap-3">
                <CompanyLogo name={app.drive?.company} size={44} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-900">{app.drive?.company} — {app.drive?.role}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Applied {formatDate(app.registeredAt)} · Drive {formatDate(app.drive?.driveDate)} · Closes {formatDate(app.drive?.deadline)}</p>
                </div>
                <StatusBadge status={app.status} />
              </div>
              <Tracker status={app.status} />
              <div className="mt-4 flex gap-2">
                <Link to={`/student/drives/${app.driveId}`} className="btnx btnx-secondary btnx-sm">View drive</Link>
                {(app.status === 'REGISTERED' || app.status === 'APPLIED') && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmWithdraw(app)}>Withdraw</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!confirmWithdraw} onClose={() => setConfirmWithdraw(null)} title="Withdraw application?"
        subtitle={confirmWithdraw ? `${confirmWithdraw.drive?.company} — ${confirmWithdraw.drive?.role}` : ''}
        footer={<><Button variant="secondary" size="sm" onClick={() => setConfirmWithdraw(null)}>Keep it</Button><Button variant="danger-solid" size="sm" loading={acting} onClick={handleWithdraw}>Withdraw</Button></>}>
        <p className="text-sm text-slate-600">You can re-apply before the deadline if seats remain.</p>
      </Modal>
    </div>
  )
}
