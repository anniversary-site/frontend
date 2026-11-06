import { useRef, type ReactNode } from 'react'

export default function PreviewModalBody({
  className,
  children,
}: {
  className: string
  children: ReactNode
}) {
  const drag = useRef<{
    id: number
    x: number
    y: number
    viewport: HTMLElement | null
  } | null>(null)

  return (
    <div
      className={`preview-modal-body ${className}`}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.pointerType === 'touch' || event.button !== 0) return
        if (!(event.target instanceof Element)) return
        if (event.target.closest('a, button, input, textarea, select, [contenteditable]')) return

        const body = event.currentTarget
        const viewport = event.target.closest<HTMLElement>('.zoom-preview-viewport')
        if (
          body.scrollHeight <= body.clientHeight &&
          (!viewport ||
            (viewport.scrollWidth <= viewport.clientWidth &&
              viewport.scrollHeight <= viewport.clientHeight))
        ) return

        event.preventDefault()
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, viewport }
        body.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        const active = drag.current
        if (active?.id !== event.pointerId) return

        const dx = active.x - event.clientX
        let dy = active.y - event.clientY
        active.x = event.clientX
        active.y = event.clientY

        if (active.viewport) {
          const view = active.viewport
          const top = view.scrollTop
          view.scrollLeft += dx
          view.scrollTop += dy
          dy -= view.scrollTop - top
        }
        event.currentTarget.scrollTop += dy
      }}
      onLostPointerCapture={(event) => {
        if (drag.current?.id === event.pointerId) drag.current = null
      }}
    >
      {children}
    </div>
  )
}
