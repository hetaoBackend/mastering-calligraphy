'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Eraser } from "lucide-react"
import ReactMarkdown from 'react-markdown'

const brushCursor = `data:image/svg+xml;base64,${btoa(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"/></svg>'
)}`

const activeBrushCursor = `data:image/svg+xml;base64,${btoa(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="black" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"/></svg>'
)}`

const CalligraphyCritique = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gridCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [critique, setCritique] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    initCanvas()
    drawGrid()
  }, [])

  const initCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    const dpr = window.devicePixelRatio || 1

    canvas.width = container.clientWidth * dpr
    canvas.height = container.clientHeight * dpr

    const context = canvas.getContext('2d')
    if (!context) return

    context.scale(dpr, dpr)
    context.lineCap = 'round'
    context.strokeStyle = '#000000'
    context.lineWidth = 3
    contextRef.current = context
  }

  const drawGrid = () => {
    const canvas = gridCanvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)'
    ctx.lineWidth = 1

    const width = canvas.width
    const height = canvas.height

    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(width, height)
    ctx.moveTo(width, 0)
    ctx.lineTo(0, height)
    ctx.stroke()
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !contextRef.current) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    contextRef.current.beginPath()
    contextRef.current.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    contextRef.current.lineTo(x, y)
    contextRef.current.stroke()
  }

  const stopDrawing = () => {
    if (!contextRef.current) return
    contextRef.current.closePath()
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    if (!canvasRef.current || !contextRef.current) return
    contextRef.current.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    )
  }

  const handleSubmit = async () => {
    if (!canvasRef.current) return

    setLoading(true)
    const imageData = canvasRef.current.toDataURL('image/png')

    try {
      const response = await fetch('/api/analyze-calligraphy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze calligraphy')
      }

      const result = await response.json()
      setCritique(result.critique)
    } catch (error) {
      console.error('Error:', error)
      setCritique('分析失败，请重试。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-4xl mx-auto backdrop-blur-lg bg-white/10 border-none shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
              每日一练
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative group">
              <div className="w-full h-[400px] bg-transparent">
                <div className="relative w-1/2 h-full mx-auto">
                  <div className="absolute inset-0 border border-gray-200 bg-white">
                    <canvas
                      ref={gridCanvasRef}
                      className="absolute inset-0 w-full h-full"
                    />
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="absolute inset-0 w-full h-full"
                      style={{ 
                        touchAction: 'none',
                        cursor: isDrawing ? `url(${activeBrushCursor}) 0 24, auto` : `url(${brushCursor}) 0 24, auto`
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 w-1/2 mx-auto space-y-6">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3"
                  >
                    {loading ? '分析中...' : '获取点评'}
                  </Button>
                </motion.div>

                {critique && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 rounded-lg bg-white/5"
                  >
                    <h3 className="text-xl font-semibold mb-4 text-purple-300">点评结果：</h3>
                    <div className="prose prose-invert prose-purple max-w-none">
                      <ReactMarkdown>{critique}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  )
}

export default CalligraphyCritique

