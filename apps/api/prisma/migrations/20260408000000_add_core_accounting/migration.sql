-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COST_OF_SALES', 'OPERATING_EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE');

-- CreateEnum
CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "CashFlowCategory" AS ENUM ('OPERATING', 'INVESTING', 'FINANCING', 'NONE');

-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'SOFT_CLOSED', 'HARD_CLOSED');

-- CreateEnum
CREATE TYPE "JournalType" AS ENUM ('GENERAL', 'CASH_RECEIPT', 'CASH_PAYMENT', 'PURCHASE', 'SALES', 'ADJUSTMENT', 'REVERSING', 'ACCRUAL', 'DEPRECIATION', 'CLOSING');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ChartOfAccount" (
    "id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "account_name_th" TEXT NOT NULL,
    "account_name_en" TEXT,
    "account_type" "AccountType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 3,
    "parent_account_code" TEXT,
    "normal_balance" "NormalBalance" NOT NULL DEFAULT 'DEBIT',
    "cash_flow_category" "CashFlowCategory" NOT NULL DEFAULT 'NONE',
    "vat_type" TEXT NOT NULL DEFAULT 'NONE',
    "tax_applicable" BOOLEAN NOT NULL DEFAULT false,
    "is_subledger" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "reporting_group" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChartOfAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closed_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "journal_number" TEXT NOT NULL,
    "journal_type" "JournalType" NOT NULL DEFAULT 'GENERAL',
    "journal_date" TIMESTAMP(3) NOT NULL,
    "posting_period" TEXT NOT NULL,
    "reference_document" TEXT,
    "narration" TEXT,
    "source_module" TEXT,
    "status" "JournalStatus" NOT NULL DEFAULT 'DRAFT',
    "total_debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "prepared_by" TEXT,
    "reviewed_by" TEXT,
    "approved_by" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntryLine" (
    "id" TEXT NOT NULL,
    "journal_entry_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "account_code" TEXT NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "dimension_site" TEXT,
    "dimension_project" TEXT,
    "dimension_dept" TEXT,

    CONSTRAINT "JournalEntryLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChartOfAccount_account_code_key" ON "ChartOfAccount"("account_code");
CREATE INDEX "ChartOfAccount_account_type_idx" ON "ChartOfAccount"("account_type");
CREATE INDEX "ChartOfAccount_parent_account_code_idx" ON "ChartOfAccount"("parent_account_code");
CREATE INDEX "ChartOfAccount_is_active_idx" ON "ChartOfAccount"("is_active");

-- CreateIndex
CREATE INDEX "AccountingPeriod_year_idx" ON "AccountingPeriod"("year");
CREATE INDEX "AccountingPeriod_status_idx" ON "AccountingPeriod"("status");
CREATE UNIQUE INDEX "AccountingPeriod_year_month_key" ON "AccountingPeriod"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_journal_number_key" ON "JournalEntry"("journal_number");
CREATE INDEX "JournalEntry_journal_type_idx" ON "JournalEntry"("journal_type");
CREATE INDEX "JournalEntry_status_idx" ON "JournalEntry"("status");
CREATE INDEX "JournalEntry_posting_period_idx" ON "JournalEntry"("posting_period");
CREATE INDEX "JournalEntry_journal_date_idx" ON "JournalEntry"("journal_date");

-- CreateIndex
CREATE INDEX "JournalEntryLine_journal_entry_id_idx" ON "JournalEntryLine"("journal_entry_id");
CREATE INDEX "JournalEntryLine_account_code_idx" ON "JournalEntryLine"("account_code");

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_parent_account_code_fkey" FOREIGN KEY ("parent_account_code") REFERENCES "ChartOfAccount"("account_code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "ChartOfAccount"("account_code") ON DELETE RESTRICT ON UPDATE CASCADE;
