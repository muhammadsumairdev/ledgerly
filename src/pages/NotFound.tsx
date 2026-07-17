import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="tabular text-7xl font-semibold tracking-tight text-faint sm:text-8xl">404</p>
      <h1 className="mt-4 text-lg font-semibold text-ink">Page not found</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Button variant="primary" className="mt-6" onClick={() => navigate('/')}>
        Back to Dashboard
      </Button>
    </div>
  )
}
