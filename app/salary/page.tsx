'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SalaryRecord } from '@/lib/database.types'
import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as any
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

export default function SalaryPage() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [records, setRecords] = useState<SalaryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ month: now.getMonth() + 1, salary: '', bonus: '', allowance: '', withholding_tax: '', note: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('salary_records').select('*').eq('year', year).order('month')
    setRecords(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [year]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('salary_records').insert({
      year,
      month: form.month,
      name: '本人',
      salary: parseFloat(form.salary) || 0,
      bonus: parseFloat(form.bonus) || 0,
      allowance: parseFloat(form.allowance) || 0,
      withholding_tax: parseFloat(form.withholding_tax) || 0,
      note: form.note || null,
    })
    await load()
    setShowForm(false)
    setSaving(false)
    setForm({ month: now.getMonth() + 1, salary: '', bonus: '', allowance: '', withholding_tax: '', note: '' })
  }

  const exportExcel = () => {
    const data: Record<string, string | number>[] = records.map(r => ({
      '年份': r.year,
      '月份': r.month,
      '姓名': r.name,
      '薪資': r.salary,
      '獎金': r.bonus,
      '津貼': r.allowance,
      '合計所得': r.salary + r.bonus + r.allowance,
      '代扣所得稅': r.withholding_tax,
      '備註': r.note ?? '',
    }))
    const totalSalary = records.reduce((s, r) => s + r.salary + r.bonus + r.allowance, 0)
    const totalTax = records.reduce((s, r) => s + r.withholding_tax, 0)
    data.push({ '年份': year, '月份': 0, '姓名': '全年合計', '薪資': 0, '獎金': 0, '津貼': 0, '合計所得': totalSalary, '代扣所得稅': totalTax, '備註': '' })

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 8 }, { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${year}年薪資`)
    XLSX.writeFile(wb, `${year}_薪資扣繳申報紀錄.xlsx`)
  }

  const totalIncome = records.reduce((s, r) => s + r.salary + r.bonus + r.allowance, 0)
  const totalTax = records.reduce((s, r) => s + r.withholding_tax, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-800">←</button>
        <h1 className="text-xl font-bold">年度所得紀錄</h1>
      </div>

      <div className="flex gap-2 items-center mb-4">
        <select value={year} onChange={e => setYear(+e.target.value)} className="border rounded px-2 py-1 text-sm">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y} 年</option>)}
        </select>
        <Button size="sm" onClick={() => setShowForm(true)}>+ 新增月份</Button>
        {loading && <span className="text-sm text-gray-400">載入中...</span>}
      </div>

      {/* 新增表單 */}
      {showForm && (
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">新增薪資記錄</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <Label>月份</Label>
                <select value={form.month} onChange={e => setForm(f => ({ ...f, month: +e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m} 月</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>薪資</Label><Input type="number" placeholder="0" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} /></div>
                <div><Label>獎金</Label><Input type="number" placeholder="0" value={form.bonus} onChange={e => setForm(f => ({ ...f, bonus: e.target.value }))} /></div>
                <div><Label>津貼</Label><Input type="number" placeholder="0" value={form.allowance} onChange={e => setForm(f => ({ ...f, allowance: e.target.value }))} /></div>
                <div><Label>代扣所得稅</Label><Input type="number" placeholder="0" value={form.withholding_tax} onChange={e => setForm(f => ({ ...f, withholding_tax: e.target.value }))} /></div>
              </div>
              <div><Label>備註</Label><Input placeholder="" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">取消</Button>
                <Button type="submit" disabled={saving} className="flex-1">{saving ? '儲存中...' : '儲存'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 年度彙總 */}
      {records.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-gray-400">全年所得合計</p>
                <p className="font-bold text-blue-600 text-lg">{totalIncome.toLocaleString()}</p>
                <p className="text-xs text-gray-400">NTD</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-gray-400">代扣稅款合計</p>
                <p className="font-bold text-orange-600 text-lg">{totalTax.toLocaleString()}</p>
                <p className="text-xs text-gray-400">NTD</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-4">
            <CardHeader><CardTitle className="text-sm">月份明細</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {records.map(r => (
                  <div key={r.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium text-sm">{r.year}/{r.month}月</span>
                      {r.note && <span className="text-xs text-gray-400 ml-2">{r.note}</span>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{(r.salary + r.bonus + r.allowance).toLocaleString()}</p>
                      {r.withholding_tax > 0 && <p className="text-xs text-orange-500">扣 {r.withholding_tax.toLocaleString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={exportExcel} className="w-full">匯出給會計師 (Excel)</Button>
          <p className="text-xs text-gray-400 text-center mt-2">含年度薪資彙總，供各類所得扣繳申報</p>
        </>
      )}

      {records.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p>尚無 {year} 年薪資紀錄</p>
          <p className="text-sm mt-1">點擊「新增月份」開始記錄</p>
        </div>
      )}
    </div>
  )
}
