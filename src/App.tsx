import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useTheme } from '@/store/theme'

// Route-level code splitting keeps the heavy pages (recharts on the dashboard)
// out of the initial bundle.
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Invoices = lazy(() => import('@/pages/Invoices'))
const InvoiceEditor = lazy(() => import('@/pages/InvoiceEditor'))
const InvoicePreview = lazy(() => import('@/pages/InvoicePreview'))
const Clients = lazy(() => import('@/pages/Clients'))
const ClientDetail = lazy(() => import('@/pages/ClientDetail'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function Fallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-app text-faint">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  )
}

export default function App() {
  const mode = useTheme((s) => s.mode)
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/new" element={<InvoiceEditor />} />
              <Route path="/invoices/:id/edit" element={<InvoiceEditor />} />
              <Route path="/invoices/:id" element={<InvoicePreview />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster
        position="top-right"
        theme={mode}
        toastOptions={{
          style: {
            background: 'var(--card)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
          },
        }}
      />
    </MotionConfig>
  )
}
