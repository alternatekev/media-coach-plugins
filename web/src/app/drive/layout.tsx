import type { Metadata } from 'next'
import DriveNav from '@/components/DriveNav'

export const metadata: Metadata = {
  title: 'RaceCor.io Pro Drive',
  description: 'Your sim racing performance dashboard — iRating, Safety Rating, trends, and race history.',
}

export default function DriveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <DriveNav />
      {children}
    </div>
  )
}
