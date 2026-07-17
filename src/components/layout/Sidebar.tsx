import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NAV } from '@/lib/nav'
import { cn } from '@/lib/utils'

/** 240px collapsible sidebar. Active item gets a soft emerald pill. Collapses to
 *  an icon rail; on mobile it's rendered inside an off-canvas drawer. */
export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean
  onToggle?: () => void
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-card">
      {/* Brand */}
      <div className={cn('flex h-14 items-center gap-2 px-4', collapsed && 'justify-center px-0')}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-fg">
          L
        </div>
        {!collapsed && <span className="text-[15px] font-semibold tracking-tight">Ledgerly</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:bg-card-hover hover:text-ink',
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      {onToggle && (
        <div className="hidden border-t border-line p-3 lg:block">
          <button
            onClick={onToggle}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-card-hover hover:text-ink',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px]" />
                Collapse
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
