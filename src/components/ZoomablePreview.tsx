import { useEffect, useRef, type ReactNode } from 'react'

const clampZoom = (zoom: number) => Math.min(300, Math.max(100, zoom))

function pinchDistance(touches: TouchList) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  )
}

export default function ZoomablePreview({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  const zoom = useRef(100)
  const viewport = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null)

  useEffect(() => {
    const view = viewport.current
    const content = image.current
    if (!view || !content) return
    let distance = 0
    let gestureScale = 1
    const zoomAt = (factor: number, clientX: number, clientY: number) => {
      const nextZoom = clampZoom(zoom.current * factor)
      const ratio = nextZoom / zoom.current
      if (ratio === 1) return

      const bounds = view.getBoundingClientRect()
      const x = clientX - bounds.left
      const y = clientY - bounds.top
      const left =
        (view.scrollLeft + x - content.clientLeft - (parseFloat(content.style.paddingLeft) || 0)) *
          ratio -
        x
      const top =
        (view.scrollTop + y - content.clientTop - (parseFloat(content.style.paddingTop) || 0)) *
          ratio -
        y
      zoom.current = nextZoom
      content.style.padding = '0'
      content.style.width = `${nextZoom}%`
      const insetX = nextZoom > 100 ? view.clientWidth * 0.3 : 0
      const insetY = nextZoom > 100 ? view.clientHeight * 0.3 : 0
      content.style.padding = `${insetY}px ${insetX}px`
      view.scrollLeft = left + insetX
      view.scrollTop = top + insetY
    }
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      const delta =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? view.clientHeight : 1)
      zoomAt(Math.exp(-delta * 0.01), event.clientX, event.clientY)
    }
    const startPinch = (event: TouchEvent) => {
      if (
        event.touches.length === 2 &&
        Array.from(event.touches).every((touch) => view.contains(touch.target as Node))
      ) {
        event.preventDefault()
        distance = pinchDistance(event.touches)
      }
    }
    const movePinch = (event: TouchEvent) => {
      if (event.touches.length !== 2 || distance <= 0) return
      event.preventDefault()
      const nextDistance = pinchDistance(event.touches)
      const ratio = distance > 0 && nextDistance > 0 ? nextDistance / distance : 1
      distance = nextDistance
      const [first, second] = Array.from(event.touches)
      zoomAt(ratio, (first.clientX + second.clientX) / 2, (first.clientY + second.clientY) / 2)
    }
    const endPinch = () => {
      distance = 0
    }
    const gestureStart = (event: Event) => {
      event.preventDefault()
      gestureScale = 1
    }
    const gestureChange = (event: Event) => {
      const { scale, clientX, clientY } = event as MouseEvent & { scale: number }
      if (!Number.isFinite(scale) || scale <= 0) return
      event.preventDefault()
      const ratio = scale / gestureScale
      gestureScale = scale
      const bounds = view.getBoundingClientRect()
      zoomAt(
        ratio,
        clientX ?? bounds.left + bounds.width / 2,
        clientY ?? bounds.top + bounds.height / 2,
      )
    }
    view.addEventListener('wheel', wheel, { passive: false })
    view.addEventListener('touchstart', startPinch, { passive: false })
    view.addEventListener('touchmove', movePinch, { passive: false })
    view.addEventListener('touchend', endPinch)
    view.addEventListener('touchcancel', endPinch)
    view.addEventListener('gesturestart', gestureStart)
    view.addEventListener('gesturechange', gestureChange)
    return () => {
      view.removeEventListener('wheel', wheel)
      view.removeEventListener('touchstart', startPinch)
      view.removeEventListener('touchmove', movePinch)
      view.removeEventListener('touchend', endPinch)
      view.removeEventListener('touchcancel', endPinch)
      view.removeEventListener('gesturestart', gestureStart)
      view.removeEventListener('gesturechange', gestureChange)
    }
  }, [])

  return (
    <div
      ref={viewport}
      className="zoom-preview-viewport"
      role="region"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(event) => {
        if (zoom.current === 100 || event.pointerType === 'touch' || event.button !== 0) return
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
      <div ref={image} className="zoom-preview-content">
        {children}
      </div>
    </div>
  )
}
