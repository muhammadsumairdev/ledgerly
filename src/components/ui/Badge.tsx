import { cn } from '@/lib/utils'

/** Small dot + text badge. Pass a hard hex `color` for the dot so it reads the
 *  same in both themes. With no color it renders a neutral tag pill. */
export function Badge({
  label,
  color,
  className,
}: {
  label: string
  color?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2 py-0.5 text-xs font-medium text-ink-soft whitespace-nowrap',
        className,
      )}
    >
      {color && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </span>
  )
}

/** A bare status dot (no pill) for dense table cells. */
export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full', className)}
      style={{ backgroundColor: color }}
    />
  )
}
