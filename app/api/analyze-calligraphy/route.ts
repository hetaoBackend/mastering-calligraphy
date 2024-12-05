import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

const prompt = `请你作为一位专业的硬笔书法比赛评委，对选手提交的单个字的书法作品从以下五个角度进行专业的点评，并为每个维度打分（1到10分）。同时，给出一个总体评分。

1. **结构**：字的比例、重心和布局是否均衡协调。
2. **笔画**：笔画的形状、力度、连贯性及起收笔的细腻度。
3. **字形**：整体字形是否端正、协调，与所选字体的特征一致。
4. **流畅性**：书写是否流畅自然，有节奏感，无僵硬或生硬感。
5. **细节**：转折、过渡和收笔的处理是否到位、干净利落。

请对每个维度进行详细的评价，并给出分数,在最后统一给出总体评分和建议。

## Examples


\`\`\`example

练字是一个长期的过程，需要不断地练习和改进，以下是点评结果：

---
**结构**：...。评分：x/10

**笔画**：...。评分：x/10

**字形**：...。评分：x/10

**流畅性**：...。评分：x/10

**细节**：...。评分：x/10

---
**总体评分**：**xx分**

**小建议**：...

\`\`\`

## Constraints
- 五个维度取平均来得到总体评分，评分范围为1到10分。
- 打分务必严格,不要随意给7分以上。`

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
          role: "system",
          content: [
            { type: "text", text: prompt }
          ],
        },
        {
          role: "user",
          content: [
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
            console.log('Original content:', content);
            
            const jsonString = JSON.stringify({ content });
            console.log('JSON stringified:', jsonString);
            
            const encoded = encoder.encode(`data: ${jsonString}\n\n`);
            console.log('Encoded length:', encoded.length);
            
            await writer.write(encoded);
          }
        }
      } finally {
        console.log('Stream completed');
        await writer.close();
      }
    }

    processStream();

    // Add proper headers for UTF-8 encoding
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 })
  }
}

