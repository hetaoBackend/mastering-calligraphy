import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

const prompt = `请你作为一位书法老师，对这幅书法作品进行专业的点评。请从以下几个方面进行分析：
1. 整体布局和结构
2. 笔画的力度和质量
3. 字体的规范性
4. 具体需要改进的地方
5. 总体评价和建议

请用专业但易懂的语言进行点评，给出具体的改进建议。`

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    const data = await req.json()
    const imageUrl = data.imageUrl

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the AI request
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
      stream: true, // Enable streaming
    })

    // Process the stream
    const processStream = async () => {
      try {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }
      } finally {
        await writer.close();
      }
    }

    processStream();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 })
  }
}

