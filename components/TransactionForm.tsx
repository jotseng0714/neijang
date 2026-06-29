'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Transaction } from '@/lib/database.types'

interface Props {
  initial?: Partial<Transaction>
  onSubmit: (data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onCancel?: () => void
  inputMethod?: string
}

export default function TransactionForm({ initial, onSubmit, onCancel, inputMethod = 'manual' }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [type, setType] = useState<'收入' | '支出'>(initial?.type ?? '支出')
  const [form, setForm] = useState({
    date: initial?.date ?? today,
    expense_category: initial?.expense_category ?? '',
    income_category: initial?.income_category ?? '',
    amount: initial?.amount?.toString() ?? '',
    currency: initial?.currency ?? 'NTD',
    vendor: initial?.vendor ?? '',
    invoice_number: initial?.invoice_number ?? '',
    purpose: initial?.purpose ?? '',
    note: initial?.note ?? '',
    is_reimbursable: initial?.is_reimbursable ?? false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key: string, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date || !form.amount) { setError('請填寫日期和金額'); return }
    if (type === '支出' && !form.expense_category) { setError('請選擇支出分類'); return }
    if (type === '收入' && !form.income_category) { setError('請選擇收入分類'); return }
    if (!form.purpose) { setError('請填寫用途'); return }

    setLoading(true)
    setError('')
    try {
      await onSubmit({
        date: form.date,
        type,
        expense_category: type === '支出' ? (form.expense_category as Transaction['expense_category']) : null,
        income_category: type === '收入' ? (form.income_category as Transaction['income_category']) : null,
        amount: parseFloat(form.amount),
        currency: form.currency as 'NTD' | 'USD',
        vendor: form.vendor || null,
        invoice_number: form.invoice_number || null,
        purpose: form.purpose || null,
        note: form.note || null,
        is_reimbursable: form.is_reimbursable,
        is_reimbursed: initial?.is_reimbursed ?? false,
        reimbursed_date: initial?.reimbursed_date ?? null,
        receipt_url: initial?.receipt_url ?? null,
        input_method: inputMethod,
      })
    } catch {
      setError('儲存失敗，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 類型切換 */}
      <div className="flex gap-2">
        {(['支出', '收入'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              type === t
                ? t === '支出' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>日期 *</Label>
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div>
          <Label>金額 *</Label>
          <div className="flex gap-1">
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              required
            />
            <Select value={form.currency} onValueChange={v => set('currency', v)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NTD">NTD</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 分類 */}
      {type === '支出' ? (
        <div>
          <Label>支出分類 *</Label>
          <Select value={form.expense_category} onValueChange={v => set('expense_category', v)}>
            <SelectTrigger>
              <SelectValue placeholder="選擇分類" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div>
          <Label>收入分類 *</Label>
          <Select value={form.income_category} onValueChange={v => set('income_category', v)}>
            <SelectTrigger>
              <SelectValue placeholder="選擇分類" />
            </SelectTrigger>
            <SelectContent>
              {INCOME_CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>廠商 / 客戶</Label>
        <Input placeholder="廠商或客戶名稱" value={form.vendor} onChange={e => set('vendor', e.target.value)} />
      </div>

      <div>
        <Label>用途 / 品項 *</Label>
        <Input placeholder="例：購買包裝材料、代工費" value={form.purpose} onChange={e => set('purpose', e.target.value)} />
      </div>

      <div>
        <Label>發票 / 收據號碼</Label>
        <Input placeholder="AB12345678" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} />
      </div>

      <div>
        <Label>備註</Label>
        <Textarea placeholder="其他補充說明" value={form.note} onChange={e => set('note', e.target.value)} rows={2} />
      </div>

      {type === '支出' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_reimbursable}
            onChange={e => set('is_reimbursable', e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">個人墊付（月底請款）</span>
        </label>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            取消
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? '儲存中...' : '儲存'}
        </Button>
      </div>
    </form>
  )
}
