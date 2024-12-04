import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    )

    // Initialize OSS client
    const client = new OSS({
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET!,
      secure: true, // 使用 HTTPS
    })

    // Generate unique filename
    const fileName = `calligraphy/${Date.now()}.png`

    // Upload to OSS
    const result = await client.put(fileName, imageBuffer, {
      mime: 'image/png',
      headers: {
        'Cache-Control': 'public, max-age=3600', // 设置缓存最大有效期为1小时
      }
    })

    // 直接使用 OSS 返回的 URL
    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
} 