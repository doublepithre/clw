import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="pl-64">
        <Outlet />
      </main>
    </div>
  )
}
