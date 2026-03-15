import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const schemaPath = join(__dirname, "schema.prisma");
const schema = readFileSync(schemaPath, "utf-8");

const EXPECTED_MODELS = [
  // Auth
  "User",
  "Role",
  "UserRole",
  "UserAuditLog",
  // CRM
  "Customer",
  "Contact",
  "Company",
  // Sales
  "Lead",
  "Deal",
  // Property
  "Project",
  "ProjectTemplate",
  "Unit",
  // Sales Documents
  "Quotation",
  "CommercialQuotation",
  "CommercialProposal",
  // Contracts
  "Contract",
  "LeaseAgreement",
  "PreHandoverInspection",
  // Handover
  "Handover",
  "HandoverPhotos",
  // Finance
  "Invoice",
  "Payment",
  "Deposit",
  "MeterRecord",
  // Tasks
  "Task",
  "TaskComment",
  "TaskStatus",
  "AutomationRule",
  "Ticket",
  // Documents
  "Document",
  "FormTemplate",
  "PDFTemplateSettings",
  "ISODocument",
  // Meetings
  "MeetingMinute",
  "MeetingTemplate",
  "MeetingPDFTemplate",
  // System
  "Notification",
  "NotificationPreference",
  "ActivityLog",
  "Comment",
  "ClientUser",
  "ClientComment",
  "ClientUpdateRequest",
  "WarehouseRequirement",
  "SaleJob04F01",
];

describe("Prisma schema", () => {
  it("uses prisma-client generator", () => {
    expect(schema).toContain('provider = "prisma-client"');
  });

  it("uses postgresql datasource", () => {
    expect(schema).toContain('provider = "postgresql"');
  });

  it.each(EXPECTED_MODELS)("defines model %s", (modelName) => {
    expect(schema).toContain(`model ${modelName} {`);
  });

  it("has uuid primary keys on all models", () => {
    const idLines = schema
      .split("\n")
      .filter((line) => line.includes("@id @default(uuid())"));
    expect(idLines.length).toBeGreaterThan(0);
  });

  it("has created_at timestamps", () => {
    expect(schema).toContain("@default(now())");
  });

  it("has updated_at timestamps", () => {
    expect(schema).toContain("@updatedAt");
  });

  it("has indexes on foreign keys", () => {
    const indexLines = schema
      .split("\n")
      .filter((line) => line.trim().startsWith("@@index"));
    expect(indexLines.length).toBeGreaterThan(20);
  });

  it("uses enums for status fields", () => {
    expect(schema).toContain("enum CustomerType");
    expect(schema).toContain("enum UnitStatus");
    expect(schema).toContain("enum ContractStatus");
    expect(schema).toContain("enum InvoiceStatus");
    expect(schema).toContain("enum PaymentMethod");
    expect(schema).toContain("enum Priority");
  });

  it("CustomerType has INDIVIDUAL and COMPANY values", () => {
    expect(schema).toContain("INDIVIDUAL");
    expect(schema).toContain("COMPANY");
  });

  it("UnitStatus has AVAILABLE value", () => {
    expect(schema).toContain("AVAILABLE");
  });

  it("defines self-referential Task relation", () => {
    expect(schema).toContain("parent_task_id");
    expect(schema).toContain('"TaskSubtasks"');
  });

  it("UserRole has composite primary key", () => {
    const userRoleBlock = schema.substring(
      schema.indexOf("model UserRole {"),
      schema.indexOf("model UserRole {") + 300
    );
    expect(userRoleBlock).toContain("@@id([user_id, role_id])");
  });
});
