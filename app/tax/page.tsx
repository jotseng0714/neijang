'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Transaction } from '@/lib/database.types'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

// 雙月區間：1-2, 3-4, 5-6, 7-8, 9-10, 11-12
const getTaxPeriods = (year: number) =>
  [[1,2],[3,4],[5,6],[7,8],[9,10],[11,12]].map(([s,e]) => ({
    label: `${year}/${s}-${e}月`,
    startMonth: s, endMonth: e, year,
  }))

export default function TaxPage() {
  const router = useRouter()
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const defaultPeriodIdx = Math.floor((currentMonth - 1) / 2)

  const [year, setYear] = useState(now.getFullYear())
  const [periodIdx, setPeriodIdx] = useState(defaultPeriodIdx)
  const [rows, setRows] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  const periods = getTaxPeriods(year)
  const period = periods[periodIdx]

  const income = rows.filter(r => r.type === '收入')
  const expense = rows.filter(r => r.type === '支出')

  const totalIncome = income.filter(r => r.currency === 'NTD').reduce((s, r) => s + r.amount, 0)
  const totalExpense = expense.filter(r => r.currency === 'NTD').reduce((s, r) => s + r.amount, 0)
  const balance = totalIncome - totalExpense

  const incomeByCategory = income.reduce((acc, r) => {
    const key = r.income_category ?? '未分類'
    acc[key] = (acc[key] ?? 0) + r.amount
    return acc
  }, {} as Record<string, number>)

  const expenseByCategory = expense.reduce((acc, r) => {
    const key = r.expense_category ?? '未分類'
    acc[key] = (acc[key] ?? 0) + r.amount
    return acc
  }, {} as Record<string, number>)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/transactions?year=${year}`)
    const all: Transaction[] = await res.json()
    const filtered = all.filter(r => {
      const m = parseInt(r.date.split('-')[1])
      return m >= period.startMonth && m <= period.endMonth
    })
    setRows(filtered)
    setLoading(false)
  }

  useEffect(() => { load() }, [year, periodIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const exportExcel = () => {
    const sheetData: Record<string, string | number>[] = []

    // 收入彙總
    sheetData.push({ '項目': '── 收入 ──', '金額 (NTD)': '', '幣別': '', '說明': '' })
    Object.entries(incomeByCategory).forEach(([cat, amt]) => {
      sheetData.push({ '項目': cat, '金額 (NTD)': amt, '幣別': 'NTD', '說明': '' })
    })
    sheetData.push({ '項目': '收入合計', '金額 (NTD)': totalIncome, '幣別': 'NTD', '說明': '' })
    sheetData.push({ '項目': '', '金額 (NTD)': '', '幣別': '', '說明': '' })

    // 支出彙總
    sheetData.push({ '項目': '── 支出 ──', '金額 (NTD)': '', '幣別': '', '說明': '' })
    Object.entries(expenseByCategory).forEach(([cat, amt]) => {
      sheetData.push({ '項目': cat, '金額 (NTD)': amt, '幣別': 'NTD', '說明': '' })
    })
    sheetData.push({ '項目': '支出合計', '金額 (NTD)': totalExpense, '幣別': 'NTD', '說明': '' })
    sheetData.push({ '項目': '', '金額 (NTD)': '', '幣別': '', '說明': '' })
    sheetData.push({ '項目': '本期淨額', '金額 (NTD)': balance, '幣別': 'NTD', '說明': balance >= 0 ? '盈餘' : '虧損' })

    // 明細
    const detailData = rows.map(r => ({
      '日期': r.date,
      '類型': r.type,
      '分類': r.expense_category ?? r.income_category ?? '',
      '廠商/客戶': r.vendor ?? '',
      '用途/品項': r.purpose ?? '',
      '金額': r.amount,
      '幣別': r.currency,
      '發票號碼': r.invoice_number ?? '',
      '備註': r.note ?? '',
    }))

    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.json_to_sheet(sheetData)
    ws1['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 8 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws1, '彙總表')

    const ws2 = XLSX.utils.json_to_sheet(detailData)
    ws2['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 10 }, { wch: 6 }, { wch: 14 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws2, '明細')

    XLSX.writeFile(wb, `${year}${String(period.startMonth).padStart(2,'0')}-${String(period.endMonth).padStart(2,'0')}_營業稅對帳.xlsx`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-800">←</button>
        <h1 className="text-xl font-bold">雙月營業稅彙總</h1>
      </div>

      {/* 期間選擇 */}
      <div className="flex gap-2 items-center mb-4 flex-wrap">
        <select value={year} onChange={e => setYear(+e.target.value)} className="border rounded px-2 py-1 text-sm">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y} 年</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {periods.map((p, i) => (
            <button
              key={i}
              onClick={() => setPeriodIdx(i)}
              className={`px-3 py-1 rounded text-sm transition-colors ${periodIdx === i ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
            >
              {p.startMonth}-{p.endMonth}月
            </button>
          ))}
        </div>
        {loading && <span className="text-sm text-gray-400">載入中...</span>}
      </div>

      {/* 收支總覽 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-gray-400 mb-1">收入合計</p>
            <p className="font-bold text-green-600 text-lg">{totalIncome.toLocaleString()}</p>
            <p className="text-xs text-gray-400">NTD</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-gray-400 mb-1">支出合計</p>
            <p className="font-bold text-red-600 text-lg">{totalExpense.toLocaleString()}</p>
            <p className="text-xs text-gray-400">NTD</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-gray-400 mb-1">淨額</p>
            <p className={`font-bold text-lg ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {balance >= 0 ? '+' : ''}{balance.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">NTD</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* 收入分類 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">收入明細</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(incomeByCategory).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-2">本期無收入</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(incomeByCategory).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">{cat}</Badge>
                    <span className="font-medium text-green-700">{amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 支出分類 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">支出明細</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(expenseByCategory).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-2">本期無支出</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(expenseByCategory).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">{cat}</Badge>
                    <span className="font-medium text-red-700">{amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button onClick={exportExcel} className="w-full" disabled={rows.length === 0}>
        匯出給會計師 (Excel)
      </Button>
      <p className="text-xs text-gray-400 text-center mt-2">含彙總表與明細，提供會計師對照銀行餘額申報</p>
    </div>
  )
}
