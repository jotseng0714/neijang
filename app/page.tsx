'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Transaction } from '@/lib/database.types'
import Link from 'next/link'

export default function Home() {
  const now = new Date()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  useEffect(() => {
    fetch(`/api/transactions?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(d => { setTransactions(d); setLoading(false) })
  }, [year, month])

  const income = transactions.filter(t => t.type === '收入')
  const expense = transactions.filter(t => t.type === '支出')
  const totalIncome = income.filter(r => r.currency === 'NTD').reduce((s, r) => s + r.amount, 0)
  const totalExpense = expense.filter(r => r.currency === 'NTD').reduce((s, r) => s + r.amount, 0)
  const pendingReimburse = transactions.filter(t => t.is_reimbursable && !t.is_reimbursed)

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">內帳管理</h1>
        <p className="text-sm text-gray-400">{year} 年 {month} 月</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-400">本月收入</p>
            <p className="text-xl font-bold text-green-600 mt-1">{totalIncome.toLocaleString()}</p>
            <p className="text-xs text-gray-400">NTD · {income.length} 筆</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-400">本月支出</p>
            <p className="text-xl font-bold text-red-600 mt-1">{totalExpense.toLocaleString()}</p>
            <p className="text-xs text-gray-400">NTD · {expense.length} 筆</p>
          </CardContent>
        </Card>
      </div>

      {pendingReimburse.length > 0 && (
        <Link href="/reimburse">
          <Card className="mb-4 border-orange-200 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors">
            <CardContent className="pt-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-orange-800">⚠️ 個人墊付待請款</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  {pendingReimburse.length} 筆 · NTD {pendingReimburse.filter(r=>r.currency==='NTD').reduce((s,r)=>s+r.amount,0).toLocaleString()}
                </p>
              </div>
              <span className="text-orange-400">→</span>
            </CardContent>
          </Card>
        </Link>
      )}

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">快速記帳</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Link href="/scan">
            <Button className="w-full h-16 flex flex-col gap-1 text-sm" variant="outline">
              <span className="text-2xl">📷</span>
              拍照 / 上傳
            </Button>
          </Link>
          <Link href="/manual">
            <Button className="w-full h-16 flex flex-col gap-1 text-sm" variant="outline">
              <span className="text-2xl">✏️</span>
              手動輸入
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">報表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/reimburse">
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 border cursor-pointer">
              <div className="flex items-center gap-2">
                <span>💰</span>
                <div>
                  <p className="text-sm font-medium">月底墊付請款單</p>
                  <p className="text-xs text-gray-400">個人墊付清單，一鍵匯出 Excel</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </Link>
          <Link href="/tax">
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 border cursor-pointer">
              <div className="flex items-center gap-2">
                <span>🧾</span>
                <div>
                  <p className="text-sm font-medium">雙月營業稅彙總</p>
                  <p className="text-xs text-gray-400">給會計師的對帳表</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </Link>
          <Link href="/salary">
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 border cursor-pointer">
              <div className="flex items-center gap-2">
                <span>📋</span>
                <div>
                  <p className="text-sm font-medium">年度所得紀錄</p>
                  <p className="text-xs text-gray-400">薪資扣繳申報資料</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">本月最新記錄</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-4">載入中...</p>
          ) : transactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">本月尚無記錄</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 8).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-1.5 items-center flex-wrap">
                      <span className="text-xs text-gray-400">{t.date}</span>
                      <Badge variant="outline" className="text-xs">
                        {t.expense_category ?? t.income_category}
                      </Badge>
                      {t.is_reimbursable && !t.is_reimbursed && (
                        <Badge className="text-xs bg-orange-100 text-orange-700 border-0">墊付</Badge>
                      )}
                    </div>
                    <p className="text-sm truncate mt-0.5">{t.purpose ?? t.vendor ?? '—'}</p>
                  </div>
                  <p className={`font-medium text-sm ml-2 shrink-0 ${t.type === '收入' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === '收入' ? '+' : '-'}{t.currency} {t.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
