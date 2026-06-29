import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import KeysPage from '@/pages/KeysPage'
import PlaygroundPage from '@/pages/PlaygroundPage'
import FallbackPage from '@/pages/FallbackPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import LoginPage from '@/pages/LoginPage'
import SettingsPage from '@/pages/SettingsPage'
import { useAuth } from '@/lib/auth'

const queryClient = new QueryClient()

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative text-sm px-1 py-4 transition-colors ${
          isActive
            ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function DarkModeToggle() {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      setDark(true)
    }
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle theme">
      {dark ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      )}
    </Button>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block size-2 rounded-full bg-foreground" />
      <span className="font-semibold tracking-tight text-sm">FreeLLMAPI</span>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="min-h-screen bg-background">
          {isLoading ? (
            <div className="min-h-screen flex items-center justify-center bg-background">
              <div className="size-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {isAuthenticated && (
                <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
                  <div className="max-w-6xl mx-auto px-6 flex items-center">
                    <Brand />
                    <nav className="flex items-center gap-6 ml-10">
                      <NavItem to="/playground">Playground</NavItem>
                      <NavItem to="/keys">Keys</NavItem>
                      <NavItem to="/fallback">Fallback</NavItem>
                      <NavItem to="/analytics">Analytics</NavItem>
                    </nav>
                    <div className="ml-auto py-2 flex items-center gap-2">
                      <NavItem to="/settings">Settings</NavItem>
                      <span className="text-xs text-muted-foreground">{user?.username}</span>
                      <Button variant="ghost" size="sm" onClick={logout}>
                        Logout
                      </Button>
                      <DarkModeToggle />
                    </div>
                  </div>
                </header>
              )}
              <main className={isAuthenticated ? "max-w-6xl mx-auto px-6 py-8" : ""}>
                <Routes>
                  <Route path="/login" element={
                    isAuthenticated ? <Navigate to="/playground" replace /> : <LoginPage />
                  } />
                  <Route path="/" element={
                    <ProtectedRoute><Navigate to="/playground" replace /></ProtectedRoute>
                  } />
                  <Route path="/playground" element={
                    <ProtectedRoute><PlaygroundPage /></ProtectedRoute>
                  } />
                  <Route path="/keys" element={
                    <ProtectedRoute><KeysPage /></ProtectedRoute>
                  } />
                  <Route path="/fallback" element={
                    <ProtectedRoute><FallbackPage /></ProtectedRoute>
                  } />
                  <Route path="/analytics" element={
                    <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute><SettingsPage /></ProtectedRoute>
                  } />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </>
          )}
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
