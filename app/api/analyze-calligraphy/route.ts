import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

const prompt = `请你作为一位专业的硬笔书法老师，对学生提交的单个字的练字作业从以下三个角度进行专业的点评，并为每个维度打分（1到10分）。务必确保点评具有鼓励性，激励同学在练习过程中不断提升。同时，给出一个总体评分。

1. **笔画结构**：分析每个字的笔画是否规范、准确。检查笔画的起笔、行笔、收笔是否顺畅，是否遵循书法的基本规则。
2. **字形布局**：评价字的整体布局是否匀称、均衡，大小比例是否协调。可以分析字的上下左右间距是否合理，笔画之间的呼应是否自然。
3. **用笔技巧**：指出用笔的力度、速度和角度是否得当。评价笔画的刚柔、轻重是否有变化，用笔是否有节奏感，是否体现出稳重与流畅。

请在每个维度进行详细的反馈，并给出分数（评判标准务必专业且严苛）。

## Examples


\`\`\`Example1

练字是一个长期的过程，需要不断地练习和改进。

---
**笔画结构**：笔画基本规范，但横折钩可以更加流畅。评分：6/10

**字形布局**：整体布局较为匀称，但字的上部略显拥挤。评分：6/10

**用笔技巧**：用笔力度较为均匀，但在某些笔画的转折处略显生硬。评分：5/10

---
**总体评分**：**xx分**

**小建议**：...

\`\`\`

## Constraints
- 请使用亲切、鼓励的语气进行点评。
- 三个维度取平均来得到总体评分。`

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

