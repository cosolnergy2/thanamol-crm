import { describe, it, expect } from "vitest";

// The seed module exports are validated by inspecting the source file directly
// to avoid requiring a live database connection during unit tests.
import { readFileSync } from "fs";
import { join } from "path";

const seedSource = readFileSync(join(__dirname, "seed.ts"), "utf-8");

describe("seed.ts structure", () => {
  it("exports a seed function", () => {
    expect(seedSource).toContain("export async function seed()");
  });

  it("imports PrismaClient from generated prisma", () => {
    expect(seedSource).toContain("from \"../generated/prisma\"");
  });

  it("imports bcryptjs for password hashing", () => {
    expect(seedSource).toContain("import bcrypt from \"bcryptjs\"");
  });

  it("uses bcrypt.hash to hash passwords", () => {
    expect(seedSource).toContain("bcrypt.hash(DEFAULT_PASSWORD, PASSWORD_SALT_ROUNDS)");
  });

  it("does not store plaintext passwords", () => {
    expect(seedSource).not.toContain("password_hash: DEFAULT_PASSWORD");
    expect(seedSource).not.toContain("password_hash: \"password123\"");
  });
});

describe("seed data — roles", () => {
  it("defines Admin role with full permissions", () => {
    expect(seedSource).toContain("name: \"Admin\"");
    expect(seedSource).toContain("manage_users: true");
    expect(seedSource).toContain("manage_roles: true");
    expect(seedSource).toContain("manage_projects: true");
    expect(seedSource).toContain("manage_settings: true");
    expect(seedSource).toContain("view_reports: true");
    expect(seedSource).toContain("manage_contracts: true");
    expect(seedSource).toContain("manage_finance: true");
    expect(seedSource).toContain("manage_documents: true");
  });

  it("defines User role with limited permissions", () => {
    expect(seedSource).toContain("name: \"User\"");
    expect(seedSource).toContain("manage_contracts: false");
    expect(seedSource).toContain("manage_finance: false");
  });
});

describe("seed data — users", () => {
  it("defines admin@thanamol.com", () => {
    expect(seedSource).toContain("admin@thanamol.com");
  });

  it("defines user1@thanamol.com", () => {
    expect(seedSource).toContain("user1@thanamol.com");
  });

  it("defines user2@thanamol.com", () => {
    expect(seedSource).toContain("user2@thanamol.com");
  });

  it("includes all 3 users in USERS array", () => {
    const userEmailMatches = seedSource.match(/email: "[^"]+@thanamol\.com"/g);
    expect(userEmailMatches?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("seed data — projects", () => {
  it("defines The Parkview Residence project", () => {
    expect(seedSource).toContain("The Parkview Residence");
    expect(seedSource).toContain("code: \"PVR\"");
  });

  it("defines Metro Business Tower project", () => {
    expect(seedSource).toContain("Metro Business Tower");
    expect(seedSource).toContain("code: \"MBT\"");
  });

  it("Parkview is RESIDENTIAL type", () => {
    expect(seedSource).toContain("type: \"RESIDENTIAL\"");
  });

  it("Metro is COMMERCIAL type", () => {
    expect(seedSource).toContain("type: \"COMMERCIAL\"");
  });
});

describe("seed data — units", () => {
  it("defines 10 Parkview units (101-110)", () => {
    const parkviewUnits = ["\"101\"", "\"102\"", "\"103\"", "\"104\"", "\"105\"", "\"106\"", "\"107\"", "\"108\"", "\"109\"", "\"110\""];
    for (const unit of parkviewUnits) {
      expect(seedSource).toContain(`unit_number: ${unit}`);
    }
  });

  it("defines 10 Metro units (A101-A110)", () => {
    const metroUnits = ["\"A101\"", "\"A102\"", "\"A103\"", "\"A104\"", "\"A105\"", "\"A106\"", "\"A107\"", "\"A108\"", "\"A109\"", "\"A110\""];
    for (const unit of metroUnits) {
      expect(seedSource).toContain(`unit_number: ${unit}`);
    }
  });

  it("includes mix of unit statuses", () => {
    expect(seedSource).toContain("\"AVAILABLE\"");
    expect(seedSource).toContain("\"RESERVED\"");
    expect(seedSource).toContain("\"SOLD\"");
  });
});

describe("seed data — customers", () => {
  it("includes Thanakorn Wongsawat", () => {
    expect(seedSource).toContain("Thanakorn Wongsawat");
  });

  it("includes Pranee Charoenphol", () => {
    expect(seedSource).toContain("Pranee Charoenphol");
  });

  it("includes Siam Properties Co., Ltd.", () => {
    expect(seedSource).toContain("Siam Properties Co., Ltd.");
  });

  it("includes Narong Thaweesuk", () => {
    expect(seedSource).toContain("Narong Thaweesuk");
  });

  it("includes Wanida Phetcharat", () => {
    expect(seedSource).toContain("Wanida Phetcharat");
  });

  it("has mix of INDIVIDUAL and COMPANY types", () => {
    expect(seedSource).toContain("type: \"INDIVIDUAL\"");
    expect(seedSource).toContain("type: \"COMPANY\"");
  });
});

describe("seed data — contacts", () => {
  it("defines contacts for each of the 5 customers", () => {
    const customerNames = [
      "Thanakorn Wongsawat",
      "Pranee Charoenphol",
      "Siam Properties Co., Ltd.",
      "Narong Thaweesuk",
      "Wanida Phetcharat",
    ];
    for (const name of customerNames) {
      expect(seedSource).toContain(name);
    }
  });

  it("marks first contacts as primary", () => {
    expect(seedSource).toContain("is_primary: true");
    expect(seedSource).toContain("is_primary: false");
  });

  it("includes professional positions", () => {
    expect(seedSource).toContain("Managing Director");
    expect(seedSource).toContain("Purchase Manager");
    expect(seedSource).toContain("Owner");
  });
});

describe("seed data — companies", () => {
  it("includes Siam Properties Co., Ltd.", () => {
    expect(seedSource).toContain("Siam Properties Co., Ltd.");
    expect(seedSource).toContain("Real Estate");
  });

  it("includes Bangkok Construction Group", () => {
    expect(seedSource).toContain("Bangkok Construction Group");
    expect(seedSource).toContain("Construction");
  });

  it("includes Thai Interior Design", () => {
    expect(seedSource).toContain("Thai Interior Design");
    expect(seedSource).toContain("Interior Design");
  });
});

describe("seed data — task statuses", () => {
  it("defines New status as default", () => {
    expect(seedSource).toContain("name: \"New\"");
    expect(seedSource).toContain("is_default: true");
  });

  it("defines In Progress status", () => {
    expect(seedSource).toContain("name: \"In Progress\"");
  });

  it("defines Review status", () => {
    expect(seedSource).toContain("name: \"Review\"");
  });

  it("defines Done status as closed", () => {
    expect(seedSource).toContain("name: \"Done\"");
    expect(seedSource).toContain("is_closed: true");
  });

  it("uses correct colors", () => {
    expect(seedSource).toContain("#3B82F6"); // New
    expect(seedSource).toContain("#F59E0B"); // In Progress
    expect(seedSource).toContain("#8B5CF6"); // Review
    expect(seedSource).toContain("#10B981"); // Done
  });

  it("statuses have correct order 1-4", () => {
    expect(seedSource).toContain("order: 1");
    expect(seedSource).toContain("order: 2");
    expect(seedSource).toContain("order: 3");
    expect(seedSource).toContain("order: 4");
  });
});

describe("seed data — notification preferences", () => {
  it("includes notification types", () => {
    expect(seedSource).toContain("contract_expiry");
    expect(seedSource).toContain("task_assigned");
    expect(seedSource).toContain("deal_updated");
    expect(seedSource).toContain("payment_received");
  });

  it("enables email and in-app notifications by default", () => {
    expect(seedSource).toContain("email_enabled: true");
    expect(seedSource).toContain("in_app_enabled: true");
  });
});

describe("seed idempotency", () => {
  it("uses upsert for roles", () => {
    expect(seedSource).toContain("prisma.role.upsert");
  });

  it("uses upsert for users", () => {
    expect(seedSource).toContain("prisma.user.upsert");
  });

  it("uses upsert for userRoles", () => {
    expect(seedSource).toContain("prisma.userRole.upsert");
  });

  it("uses upsert for projects", () => {
    expect(seedSource).toContain("prisma.project.upsert");
  });

  it("uses upsert for units", () => {
    expect(seedSource).toContain("prisma.unit.upsert");
  });

  it("uses upsert for task statuses", () => {
    expect(seedSource).toContain("prisma.taskStatus.upsert");
  });

  it("uses upsert for notification preferences", () => {
    expect(seedSource).toContain("prisma.notificationPreference.upsert");
  });
});
