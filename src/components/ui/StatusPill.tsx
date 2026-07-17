import { motion } from 'motion/react'
import { STATUS_META } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { DisplayStatus } from '@/types'

/** Colour-coded status pill. Animates its colour when `status` changes (e.g.
 *  sent → paid), per the animation spec. */
export function StatusPill({
  status,
  size = 'md',
  className,
}: {
  status: DisplayStatus
  size?: 'sm' | 'md'
  className?: string
}) {
  const meta = STATUS_META[status]
  return (
    <motion.span
      initial={false}
      animate={{ color: meta.color, backgroundColor: meta.soft }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium capitalize whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
    >
      <motion.span
        className="h-1.5 w-1.5 rounded-full"
        initial={false}
        animate={{ backgroundColor: meta.color }}
        transition={{ duration: 0.35 }}
      />
      {meta.label}
    </motion.span>
  )
}
