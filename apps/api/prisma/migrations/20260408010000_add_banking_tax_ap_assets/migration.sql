
-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('SAVINGS', 'CURRENT', 'FIXED_DEPOSIT');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('IN_PROGRESS', 'BALANCED', 'UNBALANCED');

-- CreateEnum
CREATE TYPE "ChequeType" AS ENUM ('ISSUED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('ISSUED', 'CLEARED', 'BOUNCED', 'CANCELLED', 'VOIDED');

-- CreateEnum
CREATE TYPE "WhtDocumentType" AS ENUM ('PND1', 'PND3', 'PND53');

-- CreateEnum
CREATE TYPE "WhtStatus" AS ENUM ('DRAFT', 'ISSUED', 'SUBMITTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "APInvoiceStatus" AS ENUM ('AP_DRAFT', 'AP_PENDING_APPROVAL', 'AP_APPROVED', 'AP_PARTIALLY_PAID', 'AP_PAID', 'AP_CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentVoucherStatus" AS ENUM ('PV_DRAFT', 'PV_PENDING_APPROVAL', 'PV_APPROVED', 'PV_PAID', 'PV_CANCELLED');

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch_name" TEXT,
    "account_type" "BankAccountType" NOT NULL DEFAULT 'CURRENT',
    "gl_account_code" TEXT,
    "site_id" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "opening_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "reconciliation_number" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "reconciliation_month" TEXT NOT NULL,
    "bank_statement_balance" DECIMAL(18,2) NOT NULL,
    "book_balance" DECIMAL(18,2) NOT NULL,
    "adjusted_bank_balance" DECIMAL(18,2),
    "adjusted_book_balance" DECIMAL(18,2),
    "difference" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "reconciled_by" TEXT,
    "reconciled_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliationItem" (
    "id" TEXT NOT NULL,
    "reconciliation_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "item_type" TEXT NOT NULL,
    "is_bank_side" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BankReconciliationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChequeRegister" (
    "id" TEXT NOT NULL,
    "cheque_number" TEXT NOT NULL,
    "cheque_type" "ChequeType" NOT NULL,
    "cheque_date" TIMESTAMP(3) NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "payee_name" TEXT NOT NULL,
    "status" "ChequeStatus" NOT NULL DEFAULT 'ISSUED',
    "reference_document" TEXT,
    "cleared_date" TIMESTAMP(3),
    "bounced_date" TIMESTAMP(3),
    "journal_entry_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChequeRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithholdingTaxRecord" (
    "id" TEXT NOT NULL,
    "wht_number" TEXT NOT NULL,
    "document_type" "WhtDocumentType" NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "fiscal_month" INTEGER NOT NULL,
    "vendor_id" TEXT,
    "vendor_name" TEXT NOT NULL,
    "tax_id" TEXT,
    "income_type" TEXT,
    "gross_amount" DECIMAL(18,2) NOT NULL,
    "wht_rate" DECIMAL(5,2) NOT NULL,
    "wht_amount" DECIMAL(18,2) NOT NULL,
    "net_amount" DECIMAL(18,2) NOT NULL,
    "payment_date" TIMESTAMP(3),
    "certificate_issued" BOOLEAN NOT NULL DEFAULT false,
    "certificate_date" TIMESTAMP(3),
    "status" "WhtStatus" NOT NULL DEFAULT 'DRAFT',
    "journal_entry_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithholdingTaxRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VatTransaction" (
    "id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "document_date" TIMESTAMP(3) NOT NULL,
    "counterparty_name" TEXT NOT NULL,
    "counterparty_tax_id" TEXT,
    "net_amount" DECIMAL(18,2) NOT NULL,
    "vat_amount" DECIMAL(18,2) NOT NULL,
    "gross_amount" DECIMAL(18,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 7,
    "source_module" TEXT,
    "source_document_id" TEXT,
    "period" TEXT NOT NULL,
    "is_filed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VatTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APInvoice" (
    "id" TEXT NOT NULL,
    "ap_invoice_number" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "vendor_invoice_number" TEXT,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "payment_terms" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "wht_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "status" "APInvoiceStatus" NOT NULL DEFAULT 'AP_DRAFT',
    "matched_po_id" TEXT,
    "matched_grn_id" TEXT,
    "gl_account_code" TEXT,
    "journal_entry_id" TEXT,
    "items" JSONB,
    "notes" TEXT,
    "created_by" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "APInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentVoucher" (
    "id" TEXT NOT NULL,
    "voucher_number" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "cheque_number" TEXT,
    "status" "PaymentVoucherStatus" NOT NULL DEFAULT 'PV_DRAFT',
    "journal_entry_id" TEXT,
    "ap_invoice_ids" JSONB,
    "notes" TEXT,
    "created_by" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepreciationSchedule" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "depreciation_amount" DECIMAL(18,2) NOT NULL,
    "accumulated_total" DECIMAL(18,2) NOT NULL,
    "net_book_value" DECIMAL(18,2) NOT NULL,
    "journal_entry_id" TEXT,
    "is_posted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepreciationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetDisposal" (
    "id" TEXT NOT NULL,
    "disposal_number" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "disposal_type" TEXT NOT NULL,
    "disposal_date" TIMESTAMP(3) NOT NULL,
    "disposal_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gain_loss" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "buyer_info" TEXT,
    "journal_entry_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetDisposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetTransfer" (
    "id" TEXT NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "from_site_id" TEXT,
    "to_site_id" TEXT,
    "transfer_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "journal_entry_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_account_number_key" ON "BankAccount"("account_number");

-- CreateIndex
CREATE INDEX "BankAccount_is_active_idx" ON "BankAccount"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliation_reconciliation_number_key" ON "BankReconciliation"("reconciliation_number");

-- CreateIndex
CREATE INDEX "BankReconciliation_bank_account_id_idx" ON "BankReconciliation"("bank_account_id");

-- CreateIndex
CREATE INDEX "BankReconciliation_status_idx" ON "BankReconciliation"("status");

-- CreateIndex
CREATE INDEX "BankReconciliationItem_reconciliation_id_idx" ON "BankReconciliationItem"("reconciliation_id");

-- CreateIndex
CREATE INDEX "ChequeRegister_bank_account_id_idx" ON "ChequeRegister"("bank_account_id");

-- CreateIndex
CREATE INDEX "ChequeRegister_status_idx" ON "ChequeRegister"("status");

-- CreateIndex
CREATE INDEX "ChequeRegister_cheque_type_idx" ON "ChequeRegister"("cheque_type");

-- CreateIndex
CREATE UNIQUE INDEX "WithholdingTaxRecord_wht_number_key" ON "WithholdingTaxRecord"("wht_number");

-- CreateIndex
CREATE INDEX "WithholdingTaxRecord_document_type_idx" ON "WithholdingTaxRecord"("document_type");

-- CreateIndex
CREATE INDEX "WithholdingTaxRecord_fiscal_year_fiscal_month_idx" ON "WithholdingTaxRecord"("fiscal_year", "fiscal_month");

-- CreateIndex
CREATE INDEX "WithholdingTaxRecord_status_idx" ON "WithholdingTaxRecord"("status");

-- CreateIndex
CREATE INDEX "VatTransaction_transaction_type_idx" ON "VatTransaction"("transaction_type");

-- CreateIndex
CREATE INDEX "VatTransaction_period_idx" ON "VatTransaction"("period");

-- CreateIndex
CREATE INDEX "VatTransaction_is_filed_idx" ON "VatTransaction"("is_filed");

-- CreateIndex
CREATE UNIQUE INDEX "APInvoice_ap_invoice_number_key" ON "APInvoice"("ap_invoice_number");

-- CreateIndex
CREATE INDEX "APInvoice_vendor_id_idx" ON "APInvoice"("vendor_id");

-- CreateIndex
CREATE INDEX "APInvoice_status_idx" ON "APInvoice"("status");

-- CreateIndex
CREATE INDEX "APInvoice_due_date_idx" ON "APInvoice"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentVoucher_voucher_number_key" ON "PaymentVoucher"("voucher_number");

-- CreateIndex
CREATE INDEX "PaymentVoucher_vendor_id_idx" ON "PaymentVoucher"("vendor_id");

-- CreateIndex
CREATE INDEX "PaymentVoucher_status_idx" ON "PaymentVoucher"("status");

-- CreateIndex
CREATE INDEX "DepreciationSchedule_asset_id_idx" ON "DepreciationSchedule"("asset_id");

-- CreateIndex
CREATE INDEX "DepreciationSchedule_period_idx" ON "DepreciationSchedule"("period");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDisposal_disposal_number_key" ON "AssetDisposal"("disposal_number");

-- CreateIndex
CREATE INDEX "AssetDisposal_asset_id_idx" ON "AssetDisposal"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "AssetTransfer_transfer_number_key" ON "AssetTransfer"("transfer_number");

-- CreateIndex
CREATE INDEX "AssetTransfer_asset_id_idx" ON "AssetTransfer"("asset_id");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_reconciled_by_fkey" FOREIGN KEY ("reconciled_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationItem" ADD CONSTRAINT "BankReconciliationItem_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "BankReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeRegister" ADD CONSTRAINT "ChequeRegister_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithholdingTaxRecord" ADD CONSTRAINT "WithholdingTaxRecord_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithholdingTaxRecord" ADD CONSTRAINT "WithholdingTaxRecord_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APInvoice" ADD CONSTRAINT "APInvoice_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APInvoice" ADD CONSTRAINT "APInvoice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APInvoice" ADD CONSTRAINT "APInvoice_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepreciationSchedule" ADD CONSTRAINT "DepreciationSchedule_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDisposal" ADD CONSTRAINT "AssetDisposal_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDisposal" ADD CONSTRAINT "AssetDisposal_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetTransfer" ADD CONSTRAINT "AssetTransfer_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetTransfer" ADD CONSTRAINT "AssetTransfer_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

