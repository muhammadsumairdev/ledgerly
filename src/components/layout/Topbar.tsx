import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

/** 56px top bar: mobile menu button + brand, and the theme toggle. Creation
 *  actions live in each page's header (contextual), not here. */
export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-card/80 px-4 backdrop-blur-md">
      <button
        onClick={onOpenSidebar}
        aria-label="Open menu"
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-card-hover hover:text-ink lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link to="/" className="flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-fg">
          L
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Ledgerly</span>
      </Link>

      <div className="flex-1" />

      <ThemeToggle />
    </header>
  )
}
