import { useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const COLORS = ['#0E9F6E', '#3B82F6', '#F59E0B', '#0A2540', '#34D399']

/**
 * A one-shot confetti burst from screen centre — reserved for the moment an
 * *overdue* invoice gets paid (the single celebratory beat). Mount it with
 * `show`, and call `onDone` after ~1s to unmount. Respects reduced motion.
 */
export function Confetti({ show, onDone }: { show: boolean; onDone: () => void }) {
  const reduce = useReducedMotion()

  const pieces = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 32 + Math.random() * 0.4
        const dist = 120 + Math.random() * 220
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 60,
          rotate: Math.random() * 540 - 270,
          color: COLORS[i % COLORS.length],
          size: 6 + Math.random() * 6,
          delay: Math.random() * 0.08,
        }
      }),
    // Regenerate a fresh burst each time it is shown.
    [show],
  )

  if (reduce) return null

  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute rounded-[2px]"
              style={{ width: p.size, height: p.size * 0.6, backgroundColor: p.color }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.9 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: p.delay }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
