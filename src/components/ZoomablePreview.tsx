import { useRef, useState, type ReactNode } from 'react'

export default function ZoomablePreview({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  const [zoom, setZoom] = useState(100)
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null)

  return (
    <div className="zoom-preview">
      <div className="zoom-preview-controls" role="group" aria-label={`${label} 확대 조절`}>
        <button
          type="button"
          aria-label="축소"
          disabled={zoom === 100}
          onClick={() => setZoom(zoom - 25)}
        >
          −
        </button>
        <button
          type="button"
          aria-label={`현재 ${zoom}%, 원래 크기로`}
          onClick={() => setZoom(100)}
        >
          {zoom}%
        </button>
        <button
          type="button"
          aria-label="확대"
          disabled={zoom === 300}
          onClick={() => setZoom(zoom + 25)}
        >
          +
        </button>
      </div>
      <div
        className="zoom-preview-viewport"
        role="region"
        aria-label={label}
        tabIndex={0}
        onPointerDown={(event) => {
          if (zoom === 100 || event.pointerType === 'touch' || event.button !== 0) return
          const view = event.currentTarget
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            left: view.scrollLeft,
            top: view.scrollTop,
          }
          view.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const start = drag.current
          if (start?.id !== event.pointerId) return
          event.currentTarget.scrollLeft = start.left + start.x - event.clientX
          event.currentTarget.scrollTop = start.top + start.y - event.clientY
        }}
        onLostPointerCapture={() => {
          drag.current = null
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        <div style={{ width: `${zoom}%` }}>{children}</div>
      </div>
    </div>
  )
}
