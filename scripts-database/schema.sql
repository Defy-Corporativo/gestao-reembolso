-- =============================================
-- Gestão Reembolso - Database Schema
-- Prefixo rebl_ em TODOS os componentes
-- =============================================
-- SCRIPT PARA RECRIAR O BANCO DE DADOS
-- Este script contém tanto DROP quanto CREATE statements
-- Pode ser executado para recriar todo o schema do zero
--
-- ATENÇÃO: Executar este script irá APAGAR todos os dados!
-- =============================================

-- ============================================================
-- PARTE 0: DROP do Storage
-- ============================================================

-- Remove o bucket de comprovantes (se existir)
-- Executar via Supabase Dashboard ou API:
-- DELETE FROM storage.objects WHERE bucket_id = 'rebl_receipts';
-- DELETE FROM storage.buckets WHERE id = 'rebl_receipts';

-- ============================================================
-- PARTE 1: DROP de índices (ordem inversa de dependência)
-- ============================================================
DROP INDEX IF EXISTS idx_rebl_payment_items_payment;
DROP INDEX IF EXISTS idx_rebl_payment_items_request;
DROP INDEX IF EXISTS idx_rebl_payments_responsible;
DROP INDEX IF EXISTS idx_rebl_payments_cycle;
DROP INDEX IF EXISTS idx_rebl_payments_created_by;
DROP INDEX IF EXISTS idx_rebl_requests_cycle;
DROP INDEX IF EXISTS idx_rebl_requests_responsible;
DROP INDEX IF EXISTS idx_rebl_requests_status;
DROP INDEX IF EXISTS idx_rebl_requests_expense_date;
DROP INDEX IF EXISTS idx_rebl_cycles_status;
DROP INDEX IF EXISTS idx_rebl_cycles_reference_month;

-- ============================================================
-- PARTE 2: DROP de tabelas (ordem inversa de dependência)
-- ============================================================
DROP TABLE IF EXISTS rebl_payment_items CASCADE;
DROP TABLE IF EXISTS rebl_payments CASCADE;
DROP TABLE IF EXISTS rebl_requests CASCADE;
DROP TABLE IF EXISTS rebl_cycles CASCADE;

-- ============================================================
-- PARTE 3: CRIAÇÃO DO STORAGE
-- ============================================================

-- Criar o bucket para comprovantes de reembolso
-- Executar via Supabase Dashboard ou API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('rebl_receipts', 'rebl_receipts', false);
--
-- Policy de INSERT (upload) - apenas usuários autenticados:
-- CREATE POLICY "rebl_receipts_insert" ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'rebl_receipts');
--
-- Policy de SELECT (download) - apenas usuários autenticados:
-- CREATE POLICY "rebl_receipts_select" ON storage.objects FOR SELECT TO authenticated
--   USING (bucket_id = 'rebl_receipts');
--
-- Policy de DELETE - apenas usuários autenticados:
-- CREATE POLICY "rebl_receipts_delete" ON storage.objects FOR DELETE TO authenticated
--   USING (bucket_id = 'rebl_receipts');

-- ============================================================
-- PARTE 4: CRIAÇÃO DAS TABELAS
-- ============================================================

-- Habilitar extensão UUID (se não existir)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Tabela: Ciclos de Reembolso
-- Um ciclo agrupa todas as solicitações de um período.
-- O ciclo é criado automaticamente no primeiro registro.
-- =============================================
CREATE TABLE rebl_cycles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_month text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  opened_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  closed_at timestamptz,
  closed_by uuid REFERENCES pepl_responsibles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_rebl_cycles_status ON rebl_cycles(status);
CREATE INDEX idx_rebl_cycles_reference_month ON rebl_cycles(reference_month);

-- =============================================
-- Tabela: Solicitações de Reembolso
-- Cada solicitação pertence a um ciclo e a um responsável.
-- O responsável é sempre o usuário logado.
-- =============================================
CREATE TABLE rebl_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id uuid REFERENCES rebl_cycles(id) ON DELETE CASCADE NOT NULL,
  responsible_id uuid REFERENCES pepl_responsibles(id) ON DELETE CASCADE NOT NULL,
  expense_date date NOT NULL,
  amount decimal(12, 2) NOT NULL,
  description text NOT NULL,
  receipt_path text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'reembolsado', 'rejeitado')),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_rebl_requests_cycle ON rebl_requests(cycle_id);
CREATE INDEX idx_rebl_requests_responsible ON rebl_requests(responsible_id);
CREATE INDEX idx_rebl_requests_status ON rebl_requests(status);
CREATE INDEX idx_rebl_requests_expense_date ON rebl_requests(expense_date);

-- =============================================
-- Tabela: Pagamentos de Reembolso (efetivados)
-- Criado pelo Executivo Financeiro ao efetivar o reembolso.
-- =============================================
CREATE TABLE rebl_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id uuid REFERENCES rebl_cycles(id) ON DELETE CASCADE NOT NULL,
  responsible_id uuid REFERENCES pepl_responsibles(id) ON DELETE CASCADE NOT NULL,
  payment_date date NOT NULL,
  total_amount decimal(12, 2) NOT NULL,
  transaction_code text NOT NULL,
  created_by uuid REFERENCES pepl_responsibles(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_rebl_payments_cycle ON rebl_payments(cycle_id);
CREATE INDEX idx_rebl_payments_responsible ON rebl_payments(responsible_id);
CREATE INDEX idx_rebl_payments_created_by ON rebl_payments(created_by);

-- =============================================
-- Tabela: Itens de Pagamento (vínculo N:N)
-- Relaciona quais solicitações foram incluídas em cada pagamento.
-- =============================================
CREATE TABLE rebl_payment_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id uuid REFERENCES rebl_payments(id) ON DELETE CASCADE NOT NULL,
  request_id uuid REFERENCES rebl_requests(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(payment_id, request_id)
);

CREATE INDEX idx_rebl_payment_items_payment ON rebl_payment_items(payment_id);
CREATE INDEX idx_rebl_payment_items_request ON rebl_payment_items(request_id);
