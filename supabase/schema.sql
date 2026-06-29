-- 內帳管理系統 Schema
-- 在 Supabase SQL Editor 執行此檔案

-- 支出分類
create type expense_category as enum (
  '原物料成本',
  '工廠代工成本',
  '營運行政費用',
  '雜支費用',
  '房租費用',
  '薪資費用',
  '其他費用'
);

-- 收入分類
create type income_category as enum (
  '經銷商 B2B NTD',
  '直接客戶 B2C NTD',
  '國外經銷商 B2B USD'
);

-- 幣別
create type currency as enum ('NTD', 'USD');

-- 交易類型
create type transaction_type as enum ('收入', '支出');

-- 主交易表
create table transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type transaction_type not null,
  expense_category expense_category,
  income_category income_category,
  amount numeric(12, 2) not null,
  currency currency not null default 'NTD',
  vendor text,
  invoice_number text,
  purpose text,
  note text,
  is_reimbursable boolean not null default false,
  is_reimbursed boolean not null default false,
  reimbursed_date date,
  receipt_url text,
  input_method text not null default 'manual', -- 'ocr' | 'manual'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 薪資記錄表（給會計師年底申報用）
create table salary_records (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  name text not null default '本人',
  id_number text,
  salary numeric(12, 2) not null default 0,
  bonus numeric(12, 2) not null default 0,
  allowance numeric(12, 2) not null default 0,
  withholding_tax numeric(12, 2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

-- updated_at 自動更新
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger transactions_updated_at
  before update on transactions
  for each row execute function update_updated_at();

-- RLS (Row Level Security) - 未來多用戶擴充用
alter table transactions enable row level security;
alter table salary_records enable row level security;

-- 暫時允許全部存取（單人使用）
create policy "allow all" on transactions for all using (true) with check (true);
create policy "allow all" on salary_records for all using (true) with check (true);
