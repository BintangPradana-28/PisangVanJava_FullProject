'use client'

import { useEffect, useRef } from 'react'

export default function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Branded colors (Gold, Green Accent, Orange, Cream, Light Green)
    const colors = [
      '#D4802A', // Orange/Brown Brand
      '#00754A', // Green Accent
      '#edebe9', // Ceramic/Cream
      '#FCD34D', // Gold/Amber
      '#10B981' // Emerald Green
    ]

    interface Particle {
      x: number
      y: number
      size: number
      color: string
      speedX: number
      speedY: number
      rotation: number
      rotationSpeed: number
    }

    // Initialize 80 particles
    const particles: Particle[] = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * -height - 20,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedX: Math.random() * 3 - 1.5,
      speedY: Math.random() * 4 + 3,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 2 - 1
    }))

    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.y += p.speedY
        p.x += p.speedX
        p.rotation += p.rotationSpeed

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        // Render rect on screen
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()

        // Recycle particle if it falls below the screen bottom
        if (p.y > height) {
          p.y = -20
          p.x = Math.random() * width
          p.speedY = Math.random() * 4 + 3
        }
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    // Shutdown animation loop after 6 seconds to prevent battery/CPU load
    const timer = setTimeout(() => {
      cancelAnimationFrame(animationFrameId)
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }, 6000)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      clearTimeout(timer)
    }
  }, [])

  return (
    <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[9999]" />
  )
}
