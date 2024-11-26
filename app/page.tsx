'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import ReactMarkdown from 'react-markdown'
import html2canvas from 'html2canvas'

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
  const [loading, setLoading] = useState(false)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const [streamingCritique, setStreamingCritique] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initCanvas()
    drawGrid()
  }, [])

  const initCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const dpr = window.devicePixelRatio || 1

    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr

    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`

    const context = canvas.getContext('2d')
    if (!context) return

    context.scale(dpr, dpr)
    context.lineCap = 'round'
    context.strokeStyle = '#000000'
    context.lineWidth = 2
    contextRef.current = context
  }

  const drawGrid = () => {
    const canvas = gridCanvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    canvas.width = containerWidth
    canvas.height = containerHeight

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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !contextRef.current) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top

    contextRef.current.beginPath()
    contextRef.current.moveTo(x * scaleX / dpr, y * scaleY / dpr)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top

    contextRef.current.lineTo(x * scaleX / dpr, y * scaleY / dpr)
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
    // Clear the critique content
    setStreamingCritique('')
  }

  const handleSubmit = async () => {
    if (!canvasRef.current || !gridCanvasRef.current) return
    setLoading(true)
    setStreamingCritique('')
    
    try {
      // Create a temporary canvas with white background
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return

      // Set the same dimensions as the original canvas
      tempCanvas.width = canvasRef.current.width
      tempCanvas.height = canvasRef.current.height

      // Fill with white background
      tempCtx.fillStyle = '#FFFFFF'
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

      // Draw the grid canvas content first
      tempCtx.drawImage(gridCanvasRef.current, 0, 0, tempCanvas.width, tempCanvas.height)
      
      // Draw the original canvas content on top
      tempCtx.drawImage(canvasRef.current, 0, 0)

      // Get the image data with white background and grid
      const imageData = tempCanvas.toDataURL('image/png')

      // First, upload the image to your CDN
      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image')
      }

      const { url: cdnUrl } = await uploadResponse.json()

      // Update the analyze request to handle streaming
      const response = await fetch('/api/analyze-calligraphy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: cdnUrl }),
      })

      if (!response.ok) throw new Error('Failed to analyze calligraphy')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      // Read the streaming response
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        // Process each line
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              setStreamingCritique(prev => prev + (data.content || ''))
            } catch (e) {
              console.error('Error parsing JSON:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setStreamingCritique('分析失败，请重试。')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (!resultRef.current || !canvasRef.current) return
    
    try {
      // Create a temporary container for the share image
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.background = 'white'
      container.style.padding = '40px'
      container.style.width = '800px'
      container.style.fontFamily = 'system-ui, -apple-system, sans-serif'
      
      // Add title
      const titleDiv = document.createElement('div')
      titleDiv.style.fontSize = '32px'
      titleDiv.style.fontWeight = 'bold'
      titleDiv.style.color = '#1a1a1a'
      titleDiv.style.marginBottom = '30px'
      titleDiv.style.textAlign = 'center'
      titleDiv.textContent = '书法练习'
      container.appendChild(titleDiv)

      // Add grid container
      const gridContainer = document.createElement('div')
      gridContainer.style.position = 'relative'
      gridContainer.style.width = '500px'
      gridContainer.style.height = '500px'
      gridContainer.style.margin = '0 auto 30px auto'
      gridContainer.style.border = '2px solid #e5e5e5'
      gridContainer.style.borderRadius = '8px'
      gridContainer.style.overflow = 'hidden'
      
      // Add grid lines with improved visibility
      const gridLines = document.createElement('div')
      gridLines.style.position = 'absolute'
      gridLines.style.inset = '0'
      gridLines.style.background = `
        linear-gradient(to right, transparent 49.9%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 50.1%, transparent 50.2%),
        linear-gradient(to bottom, transparent 49.9%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 50.1%, transparent 50.2%)
      `
      gridContainer.appendChild(gridLines)
      
      // Add diagonal lines with improved visibility
      const diagonalLines = document.createElement('div')
      diagonalLines.style.position = 'absolute'
      diagonalLines.style.inset = '0'
      diagonalLines.style.background = `
        linear-gradient(45deg, transparent 49.9%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 50.1%, transparent 50.2%),
        linear-gradient(-45deg, transparent 49.9%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 50.1%, transparent 50.2%)
      `
      gridContainer.appendChild(diagonalLines)
      
      // Add the canvas content
      const canvasImage = document.createElement('img')
      canvasImage.src = canvasRef.current.toDataURL()
      canvasImage.style.position = 'absolute'
      canvasImage.style.inset = '0'
      canvasImage.style.width = '100%'
      canvasImage.style.height = '100%'
      canvasImage.style.objectFit = 'contain'
      gridContainer.appendChild(canvasImage)
      
      container.appendChild(gridContainer)
      
      // Add the critique content with improved styling
      if (resultRef.current) {
        const critiqueDiv = document.createElement('div')
        critiqueDiv.style.color = '#1a1a1a'
        critiqueDiv.style.marginTop = '20px'
        critiqueDiv.style.padding = '30px'
        critiqueDiv.style.background = '#f8f9fa'
        critiqueDiv.style.borderRadius = '12px'
        critiqueDiv.style.fontSize = '16px'
        critiqueDiv.style.lineHeight = '1.8'
        critiqueDiv.style.maxWidth = '100%'
        critiqueDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'
        critiqueDiv.innerHTML = resultRef.current.innerHTML
        
        // Fix the critique text styles
        const elements = critiqueDiv.getElementsByTagName('*')
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i] as HTMLElement
          element.style.color = '#1a1a1a'
          element.style.fontSize = '16px'
          element.style.lineHeight = '1.8'
          if (element.tagName === 'STRONG' || element.tagName === 'B') {
            element.style.color = '#000'
            element.style.fontWeight = '600'
          }
          // Remove any Tailwind classes
          element.className = ''
        }
        
        container.appendChild(critiqueDiv)
      }
      
      // Add QR code before the watermark
      const qrCodeDiv = document.createElement('div')
      qrCodeDiv.style.position = 'absolute'
      qrCodeDiv.style.top = '20px'
      qrCodeDiv.style.right = '20px'
      qrCodeDiv.style.width = '100px'
      qrCodeDiv.style.height = '100px'
      
      const qrCode = document.createElement('img')
      qrCode.src = '/qr-code.png' // Make sure to add your QR code image to the public folder
      qrCode.style.width = '100%'
      qrCode.style.height = '100%'
      qrCode.style.objectFit = 'contain'
      
      qrCodeDiv.appendChild(qrCode)
      container.appendChild(qrCodeDiv)

      // Add watermark with improved styling
      const watermark = document.createElement('div')
      watermark.style.marginTop = '30px'
      watermark.style.textAlign = 'center'
      watermark.style.color = '#666'
      watermark.style.fontSize = '14px'
      watermark.style.padding = '10px'
      watermark.style.borderTop = '1px solid #eee'
      watermark.textContent = 'Powered By hetao7@pku.edu.cn'
      container.appendChild(watermark)
      
      document.body.appendChild(container)
      
      // Generate the image with higher quality
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2
      })
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob as Blob)
        }, 'image/png')
      })
      
      // Generate timestamp for unique filename
      const timestamp = new Date().getTime()
      const filename = `calligraphy_${timestamp}.png`
      
      if (navigator.share) {
        const file = new File([blob], filename, { type: 'image/png' })
        await navigator.share({
          files: [file],
          title: '书法练习点评',
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
      
      document.body.removeChild(container)
    } catch (error) {
      console.error('分享失败:', error)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-4xl mx-auto backdrop-blur-lg bg-white/10 border-none shadow-2xl">
          <CardHeader className="text-center p-4 md:p-6">
            <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
              书法练习
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="relative group">
              <div className="w-full h-auto bg-transparent">
                <div className="relative w-full md:w-1/2 mx-auto" style={{ aspectRatio: '1/1' }}>
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
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="absolute inset-0 w-full h-full"
                      style={{ 
                        touchAction: 'none',
                        cursor: isDrawing ? `url(${activeBrushCursor}) 0 24, auto` : `url(${brushCursor}) 0 24, auto`
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-6 w-full md:w-1/2 mx-auto space-y-4 md:space-y-6">
                <div className="flex gap-3 md:gap-4">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button 
                      onClick={handleSubmit}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-2 md:py-3"
                    >
                      {loading ? '分析中...' : '帮我点评'}
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button 
                      onClick={clearCanvas}
                      variant="outline"
                      className="w-full py-2 md:py-3"
                    >
                      清除
                    </Button>
                  </motion.div>
                </div>

                {streamingCritique && (
                  <motion.div 
                    ref={resultRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 md:p-6 rounded-lg bg-white/5"
                  >
                    <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-purple-300">
                      点评结果：
                    </h3>
                    <div className="prose prose-invert prose-purple max-w-none prose-sm md:prose-base">
                      <ReactMarkdown>{streamingCritique}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}

                {streamingCritique && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={handleShare}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2 md:py-3"
                    >
                      分享练习结果
                    </Button>
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

