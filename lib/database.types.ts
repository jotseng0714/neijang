export type ExpenseCategory =
  | '原物料成本'
  | '工廠代工成本'
  | '營運行政費用'
  | '雜支費用'
  | '房租費用'
  | '薪資費用'
  | '其他費用'

export type IncomeCategory =
  | '經銷商 B2B NTD'
  | '直接客戶 B2C NTD'
  | '國外經銷商 B2B USD'

export type Currency = 'NTD' | 'USD'
export type TransactionType = '收入' | '支出'

export interface Transaction {
  id: string
  date: string
  type: TransactionType
  expense_category: ExpenseCategory | null
  income_category: IncomeCategory | null
  amount: number
  currency: Currency
  vendor: string | null
  invoice_number: string | null
  purpose: string | null
  note: string | null
  is_reimbursable: boolean
  is_reimbursed: boolean
  reimbursed_date: string | null
  receipt_url: string | null
  input_method: string
  created_at: string
  updated_at: string
}

export interface SalaryRecord {
  id: string
  year: number
  month: number
  name: string
  id_number: string | null
  salary: number
  bonus: number
  allowance: number
  withholding_tax: number
  note: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>
      }
      salary_records: {
        Row: SalaryRecord
        Insert: Omit<SalaryRecord, 'id' | 'created_at'>
        Update: Partial<Omit<SalaryRecord, 'id' | 'created_at'>>
      }
    }
  }
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  '原物料成本',
  '工廠代工成本',
  '營運行政費用',
  '雜支費用',
  '房租費用',
  '薪資費用',
  '其他費用',
]

export const INCOME_CATEGORIES: IncomeCategory[] = [
  '經銷商 B2B NTD',
  '直接客戶 B2C NTD',
  '國外經銷商 B2B USD',
]
