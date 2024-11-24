import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

export async function POST(req: NextRequest) {
  try {
    // Get image data from request
    const data = await req.json()
    const imageUrl = data.imageUrl // Assuming image URL is sent in request

    // Prepare prompt for GPT-4 Vision
    const prompt = `你是一位专业的书法评审专家。请对这幅书法作品进行简要评价，不要超过100字，包括以下方面：
    1. 评分 (1-10分)：
       - 章法布局 (composition)
       - 技法运用 (technique)
       - 结构严谨 (structure)
       - 艺术表现 (artistic)
    2. 详细点评，包括：
       - 整体评价
       - 优点
       - 建议改进
       - 总结
    最终输出使用markdown格式。`

    // Call GPT-4 Vision API
    const response = await openai.chat.completions.create({
      model: "qwen-vl-max",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: imageUrl }
          ],
        },
      ],
      max_tokens: 1000,
    })

    // Parse GPT-4's response to extract scores and critique
    const analysis = response.choices[0].message.content
    
    if (!analysis) {
      throw new Error('No analysis received from OpenAI')
    }

    // Extract scores using regex with null safety
    const scores = {
      composition: parseFloat(analysis?.match(/章法布局.*?(\d+(\.\d+)?)/)?.[1] ?? "7.0"),
      technique: parseFloat(analysis?.match(/技法运用.*?(\d+(\.\d+)?)/)?.[1] ?? "7.0"),
      structure: parseFloat(analysis?.match(/结构严谨.*?(\d+(\.\d+)?)/)?.[1] ?? "7.0"),
      artistic: parseFloat(analysis?.match(/艺术表现.*?(\d+(\.\d+)?)/)?.[1] ?? "7.0")
    }

    const averageScore = Number((
      Object.values(scores).reduce((a, b) => a + b, 0) / 4
    ).toFixed(1))

    return NextResponse.json({
      scores,
      averageScore,
      critique: analysis
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 })
  }
}

