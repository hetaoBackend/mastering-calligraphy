import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

const prompt = `请你作为一位书法老师，对同学提交的单个字的练字作业从以下四个角度进行专业的点评，并对每个维度进行1到10的评分。请确保点评具有鼓励性，激励同学去改进，并提供中肯的建议。最后，给出一个总体评分。

1. **笔画结构**：分析每个字的笔画是否规范。
2. **字形布局**：评价字的整体布局是否匀称。
3. **用笔技巧**：指出用笔的力度、速度和角度是否得当。
4. **个性风格**：评论作品是否展现出个人的书法风格。

请根据以上四个角度提供详细的反馈和评分。

## Examples

### Example 1

- **笔画结构**：笔画规范，撇的起笔可更流畅。评分：7/10
- **字形布局**：布局匀称，捺的收笔稍加练习。评分：6/10
- **用笔技巧**：力度适中，速度稍快，放慢会更好。评分：5/10
- **个性风格**：中规中矩，期待更多个人风格。评分：4/10
- **总体评分**：**6分**

### Example 2

- **笔画结构**：笔画标准，横折钩处理得当。评分：8/10
- **字形布局**：布局合理，结构平衡。评分：9/10
- **用笔技巧**：流畅均匀，角度得当。评分：8/10
- **个性风格**：有个人风格，撇捺有创新。评分：7/10
- **总体评分**：**8分**

## Constraints
- 请使用亲切、鼓励的语气进行点评。`

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    const data = await req.json()
    const imageUrl = data.imageUrl

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the AI request
    const response = await openai.chat.completions.create({
      model: "qwen-vl-max-latest",
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

