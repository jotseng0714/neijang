'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Transaction } from '@/lib/database.types'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

export default function ReimbursePage() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState<string | null>(null)

  const pending = rows.filter(r => r.is_reimbursable && !r.is_reimbursed)
  const done = rows.filter(r => r.is_reimbursable && r.is_reimbursed)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/transactions?year=${year}&month=${month}`)
    const data: Transaction[] = await res.json()
    setRows(data.filter(d => d.is_reimbursable))
    setLoading(false)
  }

  useEffect(() => { load() }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  const markReimbursed = async (id: string) => {
    setMarking(id)
    await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_reimbursed: true, reimbursed_date: new Date().toISOString().split('T')[0] }),
    })
    await load()
    setMarking(null)
  }

  const exportExcel = () => {
    const data = pending.map((r, i) => ({
      '序號': i + 1,
      '日期': r.date,
      '品項 / 用途': r.purpose,
      '廠商': r.vendor ?? '',
      '支出分類': r.expense_category ?? '',
      '金額': r.amount,
      '幣別': r.currency,
      '發票號碼': r.invoice_number ?? '',
      '備註': r.note ?? '',
    }))
    const total = pending.reduce((s, r) => s + (r.currency === 'NTD' ? r.amount : 0), 0)
    data.push({ '序號': '' as unknown as number, '日期': '', '品項 / 用途': '', '廠商': '', '支出分類': '合計 (NTD)', '金額': total, '幣別': '', '發票號碼': '', '備註': '' })

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 6 }, { wch: 14 }, { wch: 20 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${year}年${month}月墊付`)
    XLSX.writeFile(wb, `${year}${String(month).padStart(2,'0')}_墊付請款單.xlsx`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-800">←</button>
        <h1 className="text-xl font-bold">月底墊付請款</h1>
      </div>

      {/* 月份選擇 */}
      <div className="flex gap-2 items-center mb-4">
        <select value={year} onChange={e => setYear(+e.target.value)} className="border rounded px-2 py-1 text-sm">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y} 年</option>)}
        </select>
        <select value={month} onChange={e => setMonth(+e.target.value)} className="border rounded px-2 py-1 text-sm">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{m} 月</option>
          ))}
        </select>
        {loading && <span className="text-sm text-gray-400">載入中...</span>}
      </div>

      {/* 待請款 */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">
              待請款 <Badge variant="destructive" className="ml-1">{pending.length} 筆</Badge>
            </CardTitle>
            {pending.length > 0 && (
              <Button size="sm" onClick={exportExcel}>匯出 Excel</Button>
            )}
          </div>
          {pending.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              合計 NTD：<span className="font-bold text-red-600">
                {pending.filter(r => r.currency === 'NTD').reduce((s, r) => s + r.amount, 0).toLocaleString()}
              </span>
              {pending.some(r => r.currency === 'USD') && (
                <> ／ USD：<span className="font-bold text-blue-600">
                  {pending.filter(r => r.currency === 'USD').reduce((s, r) => s + r.amount, 0).toLocaleString()}
                </span></>
              )}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">本月無待請款項目</p>
          ) : (
            <div className="space-y-2">
              {pending.map(r => (
                <div key={r.id} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-xs text-gray-400">{r.date}</span>
                      <Badge variant="outline" className="text-xs">{r.expense_category}</Badge>
                    </div>
                    <p className="font-medium text-sm mt-1 truncate">{r.purpose}</p>
                    {r.vendor && <p className="text-xs text-gray-500">{r.vendor}</p>}
                    {r.note && <p className="text-xs text-gray-400 mt-1">{r.note}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-red-600">{r.currency} {r.amount.toLocaleString()}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 text-xs h-7"
                      disabled={marking === r.id}
                      onClick={() => markReimbursed(r.id)}
                    >
                      {marking === r.id ? '...' : '已請款'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 已請款 */}
      {done.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-500">已請款紀錄 ({done.length} 筆)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {done.map(r => (
                <div key={r.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border opacity-70">
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-gray-400">{r.date}</span>
                      <Badge variant="outline" className="text-xs">{r.expense_category}</Badge>
                    </div>
                    <p className="text-sm mt-1 truncate">{r.purpose}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-500 line-through">{r.currency} {r.amount.toLocaleString()}</p>
                    <p className="text-xs text-green-600">已請款 {r.reimbursed_date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
