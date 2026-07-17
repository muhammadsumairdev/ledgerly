import { useState } from 'react'
import { cn, initials } from '@/lib/utils'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const sizes: Record<Size, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

/** Image avatar with an initials fallback (on error or missing src). */
export function Avatar({
  src,
  name,
  size = 'md',
  className,
}: {
  src?: string
  name: string
  size?: Size
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const show = src && !failed
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-card-hover font-semibold text-muted ring-1 ring-line',
        sizes[size],
        className,
      )}
      title={name}
    >
      {show ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  )
}
