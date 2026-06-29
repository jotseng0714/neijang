'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TransactionForm from '@/components/TransactionForm'
import type { Transaction } from '@/lib/database.types'
import { useRouter } from 'next/navigation'

export default function ManualPage() {
  const router = useRouter()

  const handleSubmit = async (data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('儲存失敗')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-800">←</button>
        <h1 className="text-xl font-bold">手動記帳</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">新增帳款</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm onSubmit={handleSubmit} onCancel={() => router.push('/')} />
        </CardContent>
      </Card>
    </div>
  )
}
