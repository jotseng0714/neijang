import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: '未收到圖片' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `請分析這張收據或發票圖片，擷取以下資訊並以 JSON 格式回傳。如果某欄位無法辨識請回傳 null。

回傳格式（只回傳 JSON，不要其他文字）：
{
  "date": "YYYY-MM-DD",
  "amount": 數字（不含幣別符號、逗號），
  "currency": "NTD" 或 "USD",
  "vendor": "廠商或店家名稱",
  "invoice_number": "發票號碼或收據編號",
  "purpose": "購買品項或用途簡述",
  "note": "其他備註"
}`

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } },
    ])

    const text = result.response.text().trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('OCR 回傳格式錯誤')

    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json(data)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: '辨識失敗，請手動輸入' }, { status: 500 })
  }
}
