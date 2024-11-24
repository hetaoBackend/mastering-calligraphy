import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const imageBuffer = await image.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    const prompt = `Analyze the following calligraphy image and provide a detailed critique. Consider the following aspects:
    1. Overall composition and balance
    2. Stroke technique and quality
    3. Character structure and proportion
    4. Use of space and white balance
    5. Ink quality and variation
    6. Style and artistic expression
    7. Historical context or influences (if apparent)
    8. Areas for improvement

    Please provide the critique in Chinese.`

    const { text } = await generateText({
      model: openai('gpt-4-vision-preview'),
      prompt: prompt,
      images: [{ data: base64Image, mimeType: image.type }],
    })

    return NextResponse.json({ critique: text })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 })
  }
}

