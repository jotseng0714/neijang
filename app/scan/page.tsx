'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TransactionForm from '@/components/TransactionForm'
import type { Transaction } from '@/lib/database.types'
import { useRouter } from 'next/navigation'

type OcrResult = {
  date?: string
  amount?: number
  currency?: string
  vendor?: string
  invoice_number?: string
  purpose?: string
  note?: string
}

export default function ScanPage() {
  const [image, setImage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isPdf, setIsPdf] = useState(false)
  const [ocr, setOcr] = useState<OcrResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [step, setStep] = useState<'upload' | 'confirm'>('upload')
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFile = (f: File) => {
    if (image) URL.revokeObjectURL(image)
    setFile(f)
    setIsPdf(f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    setImage(URL.createObjectURL(f))
    setStep('upload')
    setOcr(null)
    setOcrError('')
  }

  const handleScan = async () => {
    if (!file) return
    setScanning(true)
    setOcrError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/ocr', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOcr(data)
      setStep('confirm')
    } catch (e: unknown) {
      setOcrError(e instanceof Error ? e.message : 'OCR 辨識失敗，請手動輸入')
      setStep('confirm')
    } finally {
      setScanning(false)
    }
  }

  const handleSubmit = async (data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, receipt_url: image }),
    })
    if (!res.ok) throw new Error('儲存失敗')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-800">←</button>
        <h1 className="text-xl font-bold">拍照 / 上傳記帳</h1>
      </div>

      {/* 上傳區 */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          {/* 拍照：capture 會直接開啟相機 */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              if (e.target.files?.[0]) handleFile(e.target.files[0])
              e.target.value = ''
            }}
          />
          {/* 上傳：不加 capture，才能從相簿或檔案選擇圖片 / PDF */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={e => {
              if (e.target.files?.[0]) handleFile(e.target.files[0])
              e.target.value = ''
            }}
          />

          {image ? (
            <div className="space-y-3">
              {isPdf ? (
                <div className="w-full rounded-lg bg-gray-100 p-4 flex items-center gap-3">
                  <span className="text-3xl">📄</span>
                  <span className="text-sm text-gray-700 break-all">{file?.name}</span>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="收據" className="w-full rounded-lg max-h-64 object-contain bg-gray-100" />
                </>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => cameraRef.current?.click()} className="flex-1">
                  重新拍照
                </Button>
                <Button variant="outline" onClick={() => fileRef.current?.click()} className="flex-1">
                  重新上傳
                </Button>
              </div>
              <div className="flex gap-2">
                {step === 'upload' && (
                  <Button onClick={handleScan} disabled={scanning} className="flex-1">
                    {scanning ? '辨識中...' : '開始 OCR 辨識'}
                  </Button>
                )}
              </div>
              {ocrError && <p className="text-amber-600 text-sm">{ocrError}，已帶入空白表單供手動填寫。</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
                >
                  <span className="text-4xl">📷</span>
                  <span className="font-medium">拍照</span>
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
                >
                  <span className="text-4xl">📁</span>
                  <span className="font-medium">上傳照片 / PDF</span>
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">支援 JPG、PNG、HEIC、PDF 發票 / 收據</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 表單 */}
      {step === 'confirm' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {ocrError ? '手動填寫' : '確認 OCR 辨識結果'}
              {!ocrError && <span className="text-xs text-gray-400 ml-2 font-normal">請確認並修正辨識結果</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm
              initial={{
                date: ocr?.date ?? undefined,
                amount: ocr?.amount ?? undefined,
                currency: (ocr?.currency as 'NTD' | 'USD') ?? 'NTD',
                vendor: ocr?.vendor ?? undefined,
                invoice_number: ocr?.invoice_number ?? undefined,
                purpose: ocr?.purpose ?? undefined,
                note: ocr?.note ?? undefined,
              }}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/')}
              inputMethod="ocr"
            />
          </CardContent>
        </Card>
      )}

      {/* 無圖直接填表 */}
      {step === 'upload' && !image && false}
    </div>
  )
}
