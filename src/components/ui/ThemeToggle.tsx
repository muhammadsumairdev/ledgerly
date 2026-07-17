import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemeMode } from '@/store/theme'
import { cn } from '@/lib/utils'

const OPTIONS: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
  { mode: 'light', icon: Sun, label: 'Light' },
  { mode: 'dark', icon: Moon, label: 'Dark' },
  { mode: 'system', icon: Monitor, label: 'System' },
]

/** Segmented light / dark / system control. */
export function ThemeToggle({ className }: { className?: string }) {
  const mode = useTheme((s) => s.mode)
  const setMode = useTheme((s) => s.setMode)
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-line bg-app p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ mode: m, icon: Icon, label }) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          aria-label={label}
          aria-pressed={mode === m}
          title={label}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            mode === m
              ? 'bg-card text-ink shadow-sm ring-1 ring-line'
              : 'text-muted hover:text-ink',
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
