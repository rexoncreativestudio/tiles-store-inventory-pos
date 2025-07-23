// src/app/dashboard/page.tsx
// Note: This file is now at src/app/dashboard/page.tsx (no parentheses around 'dashboard')
import { redirect } from 'next/navigation';

// This component simply redirects to the dashboard overview page
export default function DashboardRootRedirect() {
  redirect('/dashboard/overview'); // Now redirects correctly
}