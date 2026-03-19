import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { ROLE_TEMPLATES } from "@thanamol/shared";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

const PASSWORD_SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = "password123";

function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SYSTEM_ROLE_NAMES = new Set(["Admin", "User"]);

const ROLE_ADMIN_TEMPLATE = ROLE_TEMPLATES.find((t) => t.name === "Admin")!;
const ROLE_SALES_MANAGER_TEMPLATE = ROLE_TEMPLATES.find((t) => t.name === "Sales Manager")!;
const ROLE_FINANCE_OFFICER_TEMPLATE = ROLE_TEMPLATES.find((t) => t.name === "Finance Officer")!;
const ROLE_VIEWER_TEMPLATE = ROLE_TEMPLATES.find((t) => t.name === "Viewer Only")!;

const ROLE_ADMIN = {
  name: "Admin",
  code: "admin",
  description: "Full permissions across all modules",
  is_system_role: true,
  permissions: ROLE_ADMIN_TEMPLATE.permissions,
};

const ROLE_USER = {
  name: "User",
  code: "user",
  description: "Read/write permissions scoped to assigned resources",
  is_system_role: true,
  permissions: ROLE_SALES_MANAGER_TEMPLATE.permissions,
};

const EXTRA_ROLES = [
  {
    name: "Sales Manager",
    code: "sales-manager",
    description: ROLE_SALES_MANAGER_TEMPLATE.description,
    is_system_role: false,
    permissions: ROLE_SALES_MANAGER_TEMPLATE.permissions,
  },
  {
    name: "Finance Officer",
    code: "finance-officer",
    description: ROLE_FINANCE_OFFICER_TEMPLATE.description,
    is_system_role: false,
    permissions: ROLE_FINANCE_OFFICER_TEMPLATE.permissions,
  },
  {
    name: "Viewer Only",
    code: "viewer-only",
    description: ROLE_VIEWER_TEMPLATE.description,
    is_system_role: false,
    permissions: ROLE_VIEWER_TEMPLATE.permissions,
  },
];

const USERS = [
  {
    email: "admin@thanamol.com",
    first_name: "Admin",
    last_name: "User",
    is_active: true,
    role: "Admin",
  },
  {
    email: "user1@thanamol.com",
    first_name: "Somchai",
    last_name: "Jaidee",
    is_active: true,
    role: "User",
  },
  {
    email: "user2@thanamol.com",
    first_name: "Siriporn",
    last_name: "Suksawat",
    is_active: true,
    role: "User",
  },
];

const PROJECTS = [
  {
    name: "The Parkview Residence",
    code: "PVR",
    type: "RESIDENTIAL",
    status: "ACTIVE" as const,
    total_units: 20,
    address: "123 Sukhumvit Rd, Bangkok",
    description: "Premium residential development in Sukhumvit area",
  },
  {
    name: "Metro Business Tower",
    code: "MBT",
    type: "COMMERCIAL",
    status: "ACTIVE" as const,
    total_units: 15,
    address: "456 Silom Rd, Bangkok",
    description: "Modern commercial tower in the heart of Bangkok's CBD",
  },
];

const PARKVIEW_UNITS = [
  { unit_number: "101", floor: 1, type: "RESIDENTIAL", area_sqm: 35, price: 2_000_000, status: "AVAILABLE" as const },
  { unit_number: "102", floor: 1, type: "RESIDENTIAL", area_sqm: 45, price: 2_500_000, status: "SOLD" as const },
  { unit_number: "103", floor: 2, type: "RESIDENTIAL", area_sqm: 50, price: 3_000_000, status: "AVAILABLE" as const },
  { unit_number: "104", floor: 2, type: "RESIDENTIAL", area_sqm: 55, price: 3_200_000, status: "RESERVED" as const },
  { unit_number: "105", floor: 3, type: "RESIDENTIAL", area_sqm: 60, price: 3_500_000, status: "AVAILABLE" as const },
  { unit_number: "106", floor: 4, type: "RESIDENTIAL", area_sqm: 65, price: 3_800_000, status: "SOLD" as const },
  { unit_number: "107", floor: 5, type: "RESIDENTIAL", area_sqm: 70, price: 4_200_000, status: "AVAILABLE" as const },
  { unit_number: "108", floor: 6, type: "RESIDENTIAL", area_sqm: 80, price: 5_000_000, status: "RESERVED" as const },
  { unit_number: "109", floor: 8, type: "RESIDENTIAL", area_sqm: 100, price: 6_500_000, status: "AVAILABLE" as const },
  { unit_number: "110", floor: 10, type: "RESIDENTIAL", area_sqm: 120, price: 8_000_000, status: "AVAILABLE" as const },
];

const METRO_UNITS = [
  { unit_number: "A101", floor: 1, type: "COMMERCIAL", area_sqm: 50, price: 5_000_000, status: "AVAILABLE" as const },
  { unit_number: "A102", floor: 1, type: "COMMERCIAL", area_sqm: 60, price: 6_000_000, status: "RESERVED" as const },
  { unit_number: "A103", floor: 2, type: "COMMERCIAL", area_sqm: 70, price: 7_000_000, status: "AVAILABLE" as const },
  { unit_number: "A104", floor: 2, type: "COMMERCIAL", area_sqm: 80, price: 8_000_000, status: "AVAILABLE" as const },
  { unit_number: "A105", floor: 3, type: "COMMERCIAL", area_sqm: 90, price: 9_000_000, status: "RESERVED" as const },
  { unit_number: "A106", floor: 4, type: "COMMERCIAL", area_sqm: 100, price: 10_000_000, status: "AVAILABLE" as const },
  { unit_number: "A107", floor: 5, type: "COMMERCIAL", area_sqm: 120, price: 11_500_000, status: "AVAILABLE" as const },
  { unit_number: "A108", floor: 6, type: "COMMERCIAL", area_sqm: 140, price: 12_500_000, status: "RESERVED" as const },
  { unit_number: "A109", floor: 8, type: "COMMERCIAL", area_sqm: 160, price: 14_000_000, status: "AVAILABLE" as const },
  { unit_number: "A110", floor: 10, type: "COMMERCIAL", area_sqm: 200, price: 15_000_000, status: "AVAILABLE" as const },
];

const CUSTOMERS = [
  {
    name: "Thanakorn Wongsawat",
    email: "thanakorn@email.com",
    phone: "081-234-5678",
    address: "12 Ramkhamhaeng Rd, Bangkok",
    type: "INDIVIDUAL" as const,
    status: "ACTIVE" as const,
  },
  {
    name: "Pranee Charoenphol",
    email: "pranee@email.com",
    phone: "082-345-6789",
    address: "34 Ladprao Rd, Bangkok",
    type: "INDIVIDUAL" as const,
    status: "PROSPECT" as const,
  },
  {
    name: "Siam Properties Co., Ltd.",
    email: "contact@siamproperties.co.th",
    phone: "02-456-7890",
    address: "567 Sathorn Rd, Bangkok",
    tax_id: "0105556789012",
    type: "COMPANY" as const,
    status: "ACTIVE" as const,
  },
  {
    name: "Narong Thaweesuk",
    email: "narong@email.com",
    phone: "083-456-7890",
    address: "89 Phaholyothin Rd, Bangkok",
    type: "INDIVIDUAL" as const,
    status: "ACTIVE" as const,
  },
  {
    name: "Wanida Phetcharat",
    email: "wanida@email.com",
    phone: "084-567-8901",
    address: "23 Bangna-Trad Rd, Bangkok",
    type: "INDIVIDUAL" as const,
    status: "PROSPECT" as const,
  },
];

const CONTACTS_BY_CUSTOMER = [
  {
    customerName: "Thanakorn Wongsawat",
    contacts: [
      { first_name: "Thanakorn", last_name: "Wongsawat", email: "thanakorn@email.com", phone: "081-234-5678", position: "Owner", is_primary: true },
      { first_name: "Kamonwan", last_name: "Wongsawat", email: "kamonwan@email.com", phone: "081-234-5679", position: "Representative", is_primary: false },
    ],
  },
  {
    customerName: "Pranee Charoenphol",
    contacts: [
      { first_name: "Pranee", last_name: "Charoenphol", email: "pranee@email.com", phone: "082-345-6789", position: "Owner", is_primary: true },
      { first_name: "Somsak", last_name: "Charoenphol", email: "somsak.c@email.com", phone: "082-345-6790", position: "Spouse", is_primary: false },
    ],
  },
  {
    customerName: "Siam Properties Co., Ltd.",
    contacts: [
      { first_name: "Somjai", last_name: "Sirisuk", email: "somjai@siamproperties.co.th", phone: "02-456-7891", position: "Managing Director", is_primary: true },
      { first_name: "Nattaporn", last_name: "Meesuk", email: "nattaporn@siamproperties.co.th", phone: "02-456-7892", position: "Purchase Manager", is_primary: false },
    ],
  },
  {
    customerName: "Narong Thaweesuk",
    contacts: [
      { first_name: "Narong", last_name: "Thaweesuk", email: "narong@email.com", phone: "083-456-7890", position: "Owner", is_primary: true },
      { first_name: "Ratree", last_name: "Thaweesuk", email: "ratree@email.com", phone: "083-456-7891", position: "Representative", is_primary: false },
    ],
  },
  {
    customerName: "Wanida Phetcharat",
    contacts: [
      { first_name: "Wanida", last_name: "Phetcharat", email: "wanida@email.com", phone: "084-567-8901", position: "Owner", is_primary: true },
      { first_name: "Chaiwat", last_name: "Phetcharat", email: "chaiwat.p@email.com", phone: "084-567-8902", position: "Spouse", is_primary: false },
    ],
  },
];

const COMPANIES = [
  {
    name: "Siam Properties Co., Ltd.",
    tax_id: "0105556789012",
    address: "567 Sathorn Rd, Bangkok",
    phone: "02-456-7890",
    email: "contact@siamproperties.co.th",
    website: "https://siamproperties.co.th",
    industry: "Real Estate",
    status: "ACTIVE",
  },
  {
    name: "Bangkok Construction Group",
    tax_id: "0105556789034",
    address: "12 Vibhavadi Rangsit Rd, Bangkok",
    phone: "02-567-8901",
    email: "info@bkkconstruction.co.th",
    website: "https://bkkconstruction.co.th",
    industry: "Construction",
    status: "ACTIVE",
  },
  {
    name: "Thai Interior Design",
    tax_id: "0105556789056",
    address: "45 Ratchadaphisek Rd, Bangkok",
    phone: "02-678-9012",
    email: "hello@thaiinterior.co.th",
    website: "https://thaiinterior.co.th",
    industry: "Interior Design",
    status: "ACTIVE",
  },
];

const TASK_STATUSES = [
  { name: "New", color: "#3B82F6", order: 1, is_default: true, is_closed: false },
  { name: "In Progress", color: "#F59E0B", order: 2, is_default: false, is_closed: false },
  { name: "Review", color: "#8B5CF6", order: 3, is_default: false, is_closed: false },
  { name: "Done", color: "#10B981", order: 4, is_default: false, is_closed: true },
];

const NOTIFICATION_TYPES = ["contract_expiry", "task_assigned", "deal_updated", "payment_received"];

async function seedRoles() {
  const adminRole = await prisma.role.upsert({
    where: { name: ROLE_ADMIN.name },
    update: {
      permissions: ROLE_ADMIN.permissions,
      description: ROLE_ADMIN.description,
      code: ROLE_ADMIN.code,
      is_system_role: true,
    },
    create: ROLE_ADMIN,
  });

  const userRole = await prisma.role.upsert({
    where: { name: ROLE_USER.name },
    update: {
      permissions: ROLE_USER.permissions,
      description: ROLE_USER.description,
      code: ROLE_USER.code,
      is_system_role: true,
    },
    create: ROLE_USER,
  });

  for (const roleData of EXTRA_ROLES) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        permissions: roleData.permissions,
        description: roleData.description,
        code: roleData.code,
      },
      create: roleData,
    });
  }

  return { adminRole, userRole };
}

async function seedUsers(adminRoleId: string, userRoleId: string) {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, PASSWORD_SALT_ROUNDS);

  const createdUsers = [];

  for (const userData of USERS) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        first_name: userData.first_name,
        last_name: userData.last_name,
        is_active: userData.is_active,
        password_hash: hashedPassword,
      },
      create: {
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        is_active: userData.is_active,
        password_hash: hashedPassword,
      },
    });

    const roleId = userData.role === "Admin" ? adminRoleId : userRoleId;

    await prisma.userRole.upsert({
      where: { user_id_role_id: { user_id: user.id, role_id: roleId } },
      update: {},
      create: { user_id: user.id, role_id: roleId },
    });

    createdUsers.push(user);
  }

  return createdUsers;
}

async function seedProjects() {
  const createdProjects = [];

  for (const projectData of PROJECTS) {
    const project = await prisma.project.upsert({
      where: { code: projectData.code },
      update: {
        name: projectData.name,
        type: projectData.type,
        status: projectData.status,
        total_units: projectData.total_units,
        address: projectData.address,
        description: projectData.description,
      },
      create: projectData,
    });
    createdProjects.push(project);
  }

  return createdProjects;
}

async function seedUnits(parkviewProjectId: string, metroProjectId: string) {
  for (const unitData of PARKVIEW_UNITS) {
    await prisma.unit.upsert({
      where: { project_id_unit_number: { project_id: parkviewProjectId, unit_number: unitData.unit_number } },
      update: {
        floor: unitData.floor,
        type: unitData.type,
        area_sqm: unitData.area_sqm,
        price: unitData.price,
        status: unitData.status,
      },
      create: { ...unitData, project_id: parkviewProjectId },
    });
  }

  for (const unitData of METRO_UNITS) {
    await prisma.unit.upsert({
      where: { project_id_unit_number: { project_id: metroProjectId, unit_number: unitData.unit_number } },
      update: {
        floor: unitData.floor,
        type: unitData.type,
        area_sqm: unitData.area_sqm,
        price: unitData.price,
        status: unitData.status,
      },
      create: { ...unitData, project_id: metroProjectId },
    });
  }
}

async function seedCustomers() {
  const createdCustomers: Record<string, { id: string; name: string }> = {};

  for (const customerData of CUSTOMERS) {
    const customer = await prisma.customer.upsert({
      where: { id: (await prisma.customer.findFirst({ where: { name: customerData.name } }))?.id ?? "non-existent-id" },
      update: {
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        type: customerData.type,
        status: customerData.status,
      },
      create: customerData,
    });
    createdCustomers[customerData.name] = { id: customer.id, name: customer.name };
  }

  return createdCustomers;
}

async function seedContacts(customerMap: Record<string, { id: string; name: string }>) {
  for (const { customerName, contacts } of CONTACTS_BY_CUSTOMER) {
    const customer = customerMap[customerName];
    if (!customer) continue;

    for (const contactData of contacts) {
      const existingContact = await prisma.contact.findFirst({
        where: { customer_id: customer.id, email: contactData.email },
      });

      if (!existingContact) {
        await prisma.contact.create({
          data: { ...contactData, customer_id: customer.id },
        });
      } else {
        await prisma.contact.update({
          where: { id: existingContact.id },
          data: {
            first_name: contactData.first_name,
            last_name: contactData.last_name,
            phone: contactData.phone,
            position: contactData.position,
            is_primary: contactData.is_primary,
          },
        });
      }
    }
  }
}

async function seedCompanies() {
  for (const companyData of COMPANIES) {
    const existing = await prisma.company.findFirst({ where: { name: companyData.name } });

    if (!existing) {
      await prisma.company.create({ data: companyData });
    } else {
      await prisma.company.update({
        where: { id: existing.id },
        data: {
          tax_id: companyData.tax_id,
          address: companyData.address,
          phone: companyData.phone,
          email: companyData.email,
          website: companyData.website,
          industry: companyData.industry,
          status: companyData.status,
        },
      });
    }
  }
}

async function seedTaskStatuses() {
  for (const statusData of TASK_STATUSES) {
    await prisma.taskStatus.upsert({
      where: { name: statusData.name },
      update: {
        color: statusData.color,
        order: statusData.order,
        is_default: statusData.is_default,
        is_closed: statusData.is_closed,
      },
      create: statusData,
    });
  }
}

async function seedNotificationPreferences(users: { id: string }[]) {
  for (const user of users) {
    for (const notificationType of NOTIFICATION_TYPES) {
      await prisma.notificationPreference.upsert({
        where: { user_id_notification_type: { user_id: user.id, notification_type: notificationType } },
        update: { email_enabled: true, in_app_enabled: true },
        create: {
          user_id: user.id,
          notification_type: notificationType,
          email_enabled: true,
          in_app_enabled: true,
        },
      });
    }
  }
}

export async function seed() {
  console.log("Seeding database...");

  const { adminRole, userRole } = await seedRoles();
  console.log("Roles seeded.");

  const users = await seedUsers(adminRole.id, userRole.id);
  console.log("Users and UserRoles seeded.");

  const [parkviewProject, metroProject] = await seedProjects();
  console.log("Projects seeded.");

  await seedUnits(parkviewProject.id, metroProject.id);
  console.log("Units seeded.");

  const customerMap = await seedCustomers();
  console.log("Customers seeded.");

  await seedContacts(customerMap);
  console.log("Contacts seeded.");

  await seedCompanies();
  console.log("Companies seeded.");

  await seedTaskStatuses();
  console.log("TaskStatuses seeded.");

  await seedNotificationPreferences(users);
  console.log("NotificationPreferences seeded.");

  console.log("Database seeded successfully.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
