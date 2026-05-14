import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1440px] px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
