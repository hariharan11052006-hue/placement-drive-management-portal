import React from 'react'
import { cx } from './ui'

/**
 * SINGLE SOURCE OF TRUTH for company logos.
 *
 * There are no image assets in the project, and hot-linking external images
 * would risk broken/empty logo boxes — so every company renders as a
 * brand-evocative monogram tile: correct short wordmark + brand-family color.
 * Known companies resolve through a normalized lookup (case, spacing and
 * punctuation insensitive, with common aliases). Unknown companies fall back
 * to a deterministic initials tile. This component never renders an <img>,
 * so it can never break, and every usage shares identical size/container/
 * radius/alignment.
 */

const BRANDS = [
  { keys: ['tcs', 'tataconsultancyservices', 'tataconsultancy', 'tcsion'], mark: 'TCS', bg: '#12326b' },
  { keys: ['infosys', 'infy', 'infosysltd'], mark: 'I', bg: '#007cc3' },
  { keys: ['wipro', 'wiproltd', 'wiproenterprises'], mark: 'W', bg: '#34208c' },
  { keys: ['hcltech', 'hcl', 'hcltechnologies', 'hclinfosystems'], mark: 'HCL', bg: '#d22630' },
  { keys: ['accenture', 'accenturesolutions'], mark: '>', bg: '#a100ff' },
  { keys: ['zoho', 'zohocorp', 'zohocorporation'], mark: 'Z', bg: '#d93b2b' },
  { keys: ['cognizant', 'cts', 'cognizanttechnologysolutions'], mark: 'C', bg: '#0b5fff' },
  { keys: ['capgemini', 'capgem', 'capgeminiindia'], mark: 'C', bg: '#0070ad' },
  { keys: ['techmahindra', 'techmah', 'mahindra'], mark: 'TM', bg: '#c8102e' },
  { keys: ['freshworks', 'freshwork', 'freshdesk'], mark: 'F', bg: '#0f2b46' },
]

const FALLBACK_BGS = ['#2549eb', '#047857', '#7c3aed', '#b45309', '#0284c7', '#be123c', '#0f766e']

export function normalizeCompany(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function resolveCompany(name) {
  const key = normalizeCompany(name)
  if (!key) return null
  for (const brand of BRANDS) {
    if (brand.keys.some(k => key === k || key.startsWith(k) || k.startsWith(key) && key.length >= 4)) {
      return brand
    }
  }
  return null
}

function fallbackFor(name) {
  const clean = String(name || '').trim()
  const initials = clean ? clean.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'
  let idx = 0
  for (const ch of clean) idx = (idx + ch.charCodeAt(0)) % FALLBACK_BGS.length
  return { mark: initials || '?', bg: FALLBACK_BGS[idx] }
}

/**
 * Props:
 * - name: company name (drives the lookup)
 * - size: square px (default 40). Container, radius and type scale together.
 */
export default function CompanyLogo({ name, size = 40 }) {
  const brand = resolveCompany(name)
  const { mark, bg } = brand || fallbackFor(name)
  const fontSize = Math.round(size * (mark.length === 1 ? 0.44 : mark.length === 2 ? 0.34 : 0.26))
  return (
    <span
      role="img"
      aria-label={name ? `${name} logo` : 'Company logo'}
      title={name || ''}
      className={cx('inline-flex items-center justify-center shrink-0 select-none font-extrabold text-white')}
      style={{
        width: size,
        height: size,
        fontSize,
        lineHeight: 1,
        letterSpacing: mark.length > 1 ? '0.02em' : 0,
        backgroundColor: bg,
        borderRadius: Math.max(8, Math.round(size * 0.28)),
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)',
      }}
    >
      {mark}
    </span>
  )
}
