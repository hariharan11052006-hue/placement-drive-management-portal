import React, { useEffect, useState } from 'react'
import api, { getErrorMessage } from '../services/api'
import { BarChart3, Users, Briefcase, ClipboardList, Trophy } from 'lucide-react'
import ExportButtons from '../components/ExportButtons'
import { RegistrationsByCompany, SelectionStatusChart, MonthlyActivityChart, DepartmentWiseChart } from '../components/ChartComponents'
import { PageHeader, StatCard, SectionCard, LoadingState, ErrorState, StatusBadge } from '../components/ui'
import CompanyLogo from '../components/CompanyLogo'

export default function AdminReports() {
  const [stats, setStats] = useState(null)
  const [charts, setCharts] = useState(null)
  const [reportData, setReportData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/charts'),
      api.get('/reports/registrations')
    ]).then(([statsRes, chartsRes, reportRes]) => {
      setStats(statsRes.data)
      setCharts(chartsRes.data)
      setReportData(reportRes.data || [])
      setLoading(false)
    }).catch((err) => { setError(getErrorMessage(err, 'Could not load reports')); setLoading(false) })
  }

  useEffect(load, [])

  if (loading) return <LoadingState lines={5} title="Loading reports…" />
  if (error) return <ErrorState message="Could not load reports" detail={error} onRetry={load} />

  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Reports & Analytics"
        subtitle="Live placement data — export anything as CSV or JSON."
        actions={<ExportButtons data={reportData} filename="placement-report" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
        <StatCard label="Students" value={stats?.totalStudents ?? 0} icon={<Users size={19} />} tone="blue" />
        <StatCard label="Drives" value={stats?.totalDrives ?? 0} icon={<Briefcase size={19} />} tone="purple" />
        <StatCard label="Applications" value={stats?.totalRegistrations ?? stats?.totalApplications ?? reportData.length} icon={<ClipboardList size={19} />} tone="slate" />
        <StatCard label="Selected" value={stats?.selected ?? 0} icon={<Trophy size={19} />} tone="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <SectionCard title="Registrations by company" subtitle="Where applications concentrate">
          {charts?.companyRegs ? <RegistrationsByCompany data={charts.companyRegs} /> : <p className="text-sm text-slate-500">No data.</p>}
        </SectionCard>
        <SectionCard title="Selection funnel" subtitle="Pipeline health">
          {charts?.selectionStats ? <SelectionStatusChart data={charts.selectionStats} /> : <p className="text-sm text-slate-500">No data.</p>}
        </SectionCard>
        <SectionCard title="Monthly activity" subtitle="Applications over time">
          {charts?.monthlyActivity ? <MonthlyActivityChart data={charts.monthlyActivity} /> : <p className="text-sm text-slate-500">No data.</p>}
        </SectionCard>
        <SectionCard title="Department mix" subtitle="Applications by department">
          {charts?.deptRegs ? <DepartmentWiseChart data={charts.deptRegs} /> : <p className="text-sm text-slate-500">No data.</p>}
        </SectionCard>
      </div>

      <SectionCard
        title="Registration report"
        subtitle={`${reportData.length} rows · exports include commas, quotes and newlines safely`}
        actions={<ExportButtons data={reportData} filename="placement-report" />}
      >
        {reportData.length === 0 ? <p className="text-sm text-slate-500">No registrations to report yet.</p> : (
          <div className="table-shell !shadow-none"><div className="table-scroll"><table className="tablex tablex-fixed" style={{ minWidth: 680 }}>
            <colgroup>
              <col />
              <col style={{ width: 150 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: 120 }} />
            </colgroup>
            <thead><tr><th>Student</th><th>Department</th><th>CGPA</th><th>Company</th><th>Status</th></tr></thead>
            <tbody>
              {reportData.slice(0, 50).map((row, i) => (
                <tr key={i}>
                  <td><span className="cell-main">{row.studentName || '—'}</span></td>
                  <td><span className="cell-main !font-semibold">{row.department || '—'}</span></td>
                  <td className="cell-num font-bold">{row.cgpa ?? '—'}</td>
                  <td>
                    <div className="company-cell">
                      <CompanyLogo name={row.company} size={30} />
                      <span className="company-cell-text">
                        <span className="cell-main">{row.company || '—'}</span>
                        <span className="cell-sub">{row.role || '—'}</span>
                      </span>
                    </div>
                  </td>
                  <td className="badge-cell"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table></div></div>
        )}
        {reportData.length > 50 && <p className="text-xs text-slate-500 mt-2">Showing first 50 of {reportData.length} — export for the full list.</p>}
      </SectionCard>
    </div>
  )
}
