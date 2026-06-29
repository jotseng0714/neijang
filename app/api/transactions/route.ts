import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  let query = supabase.from('transactions').select('*').order('date', { ascending: false })

  if (year && month) {
    const start = `${year}-${month.padStart(2, '0')}-01`
    const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]
    query = query.gte('date', start).lte('date', end)
  } else if (year) {
    query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('transactions').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
