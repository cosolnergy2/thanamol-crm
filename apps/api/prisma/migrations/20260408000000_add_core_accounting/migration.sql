-- Phase 1: Core Accounting - finalize schema alignment
-- Most changes were already applied; this handles remaining items

-- AlterTable
ALTER TABLE "ChartOfAccount" ALTER COLUMN "account_type" DROP DEFAULT;

-- AddForeignKey (drop first to be idempotent)
ALTER TABLE "JournalEntryLine" DROP CONSTRAINT IF EXISTS "JournalEntryLine_journal_entry_id_fkey";
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JournalEntryLine" DROP CONSTRAINT IF EXISTS "JournalEntryLine_account_code_fkey";
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "ChartOfAccount"("account_code") ON DELETE RESTRICT ON UPDATE CASCADE;
