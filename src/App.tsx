import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGlobalData } from '@/hooks/useGlobalData'
import { useStore } from '@/store/useStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { InstallPrompt } from '@/components/InstallPrompt'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import GroupDetail from '@/pages/GroupDetail'
import AddExpense from '@/pages/AddExpense'
import EditExpense from '@/pages/EditExpense'
import JoinGroup from '@/pages/JoinGroup'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, authLoading } = useStore()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-green-500"
                style={{ animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
          <p className="text-slate-400 text-sm">Loading Splito...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  useAuth()
  useGlobalData()

  return (
    // ErrorBoundary wraps everything — catches any unhandled render error
    <ErrorBoundary>
      {/* PWA install prompt — shown on all pages, appears immediately */}
      <InstallPrompt />
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/join/:inviteCode" element={<JoinGroup />} />

          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/group/:groupId" element={<PrivateRoute><GroupDetail /></PrivateRoute>} />
          <Route path="/group/:groupId/add-expense" element={<PrivateRoute><AddExpense /></PrivateRoute>} />

          {/* ← New: edit expense route */}
          <Route path="/group/:groupId/edit-expense/:expenseId" element={<PrivateRoute><EditExpense /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}
