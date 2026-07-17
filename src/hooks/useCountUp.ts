import { useEffect, useRef, useState } from 'react'

/** Animates 0 → target once on mount (stat cards). Honours reduced motion by
 *  jumping straight to the target. Supports fractional targets (money). */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || target === 0) {
      setValue(target)
      return
    }
    let start: number | null = null
    const ease = (t: number) => 1 - Math.pow(1 - t, 4) // easeOutQuart
    const step = (ts: number) => {
      if (start === null) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setValue(target * ease(p))
      if (p < 1) raf.current = requestAnimationFrame(step)
      else setValue(target)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return value
}
