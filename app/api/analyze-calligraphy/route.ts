import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Remove formData parsing since we're not receiving form data right now
    // const formData = await req.formData()
    // const image = formData.get('image') as File

    // For testing, we'll skip image validation temporarily
    // if (!image) {
    //   return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    // }

    // Generate random scores between 7 and 10 for each dimension
    const scores = {
      composition: Number((Math.random() * 3 + 7).toFixed(1)),
      technique: Number((Math.random() * 3 + 7).toFixed(1)),
      structure: Number((Math.random() * 3 + 7).toFixed(1)),
      artistic: Number((Math.random() * 3 + 7).toFixed(1))
    }

    // Calculate average score
    const averageScore = Number((
      Object.values(scores).reduce((a, b) => a + b, 0) / 4
    ).toFixed(1))

    // Updated critique with markdown formatting
    const critique = `
## 整体评价
这幅书法作品整体展现出了扎实的基本功和独特的艺术风格，值得肯定。

### 优点
- 笔画运行流畅自然，显示出作者深厚的功底
- 章法布局匀称，具有良好的视觉效果
- 字形结构稳健，传统中见创新

### 建议改进
- 可以在用墨层次上做更多变化
- 个别字的结构还可以更加严谨
- 建议在空间利用上更加大胆

### 总结
继续保持当前的练习方向，建议多临摹经典碑帖，在传统的基础上寻求突破。`

    return NextResponse.json({
      scores,
      averageScore,
      critique
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 })
  }
}

