import React from 'react'
import { Download, FileJson } from 'lucide-react'

function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  let s = Array.isArray(value) ? value.join('; ') : String(value)
  if (/[",\n\r]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function toCsv(data) {
  if (!data || data.length === 0) return ''
  const headers = Object.keys(data[0])
  const lines = [
    headers.map(escapeCsvValue).join(','),
    ...data.map(row => headers.map(h => escapeCsvValue(row[h])).join(','))
  ]
  return lines.join('\r\n')
}

function download(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function ExportButtons({ data, filename = 'report' }) {
  const exportCSV = () => {
    if (!data || data.length === 0) return
    const csv = toCsv(data)
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' }))
    download(url, `${filename}.csv`)
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    if (!data || data.length === 0) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    download(url, `${filename}.json`)
    URL.revokeObjectURL(url)
  }

  const disabled = !data || data.length === 0
  return (
    <div className="flex gap-2">
      <button onClick={exportCSV} disabled={disabled} title="Export CSV (handles commas, quotes, newlines)" className="btnx btnx-secondary btnx-sm disabled:opacity-50">
        <Download size={14} /> CSV
      </button>
      <button onClick={exportJSON} disabled={disabled} title="Export JSON" className="btnx btnx-secondary btnx-sm disabled:opacity-50">
        <FileJson size={14} /> JSON
      </button>
    </div>
  )
}
