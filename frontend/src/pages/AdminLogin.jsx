import React from 'react'
import { LoginForm } from './Login'

export default function AdminLogin() {
  return <LoginForm title="Admin sign in" subtitle="Manage drives, eligibility, registrations and reports." accent="blue" adminOnly />
}
