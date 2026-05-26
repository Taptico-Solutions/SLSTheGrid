import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", [
    "sls_admin",
    "sls_rep",
    "sls_pm",
    "client_architect",
    "client_gc",
    "user",
    "admin",
  ])
    .default("user")
    .notNull(),
  company: text("company"),
  title: text("title"),
  avatarUrl: text("avatarUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Manufacturers ────────────────────────────────────────────────────────────
export const manufacturers = mysqlTable("manufacturers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  website: text("website"),
  repName: text("repName"),
  repEmail: varchar("repEmail", { length: 320 }),
  repPhone: varchar("repPhone", { length: 32 }),
  lineCardUrl: text("lineCardUrl"),
  catalogUrl: text("catalogUrl"),
  region: varchar("region", { length: 128 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Manufacturer = typeof manufacturers.$inferSelect;
export type InsertManufacturer = typeof manufacturers.$inferInsert;

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", [
    "intake",
    "active",
    "pending_approval",
    "ordered",
    "delivered",
    "complete",
    "archived",
  ])
    .default("intake")
    .notNull(),
  region: mysqlEnum("region", [
    "georgia",
    "tennessee",
    "alabama",
    "national",
    "other",
  ]).default("georgia"),
  buildingType: varchar("buildingType", { length: 128 }),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  originalBudget: decimal("originalBudget", { precision: 12, scale: 2 }),
  currentBudget: decimal("currentBudget", { precision: 12, scale: 2 }),
  budgetStatus: mysqlEnum("budgetStatus", ["on_budget", "at_risk", "over_budget"]).default(
    "on_budget"
  ),
  timelineStatus: mysqlEnum("timelineStatus", ["on_track", "at_risk", "delayed"]).default(
    "on_track"
  ),
  assignedRepId: int("assignedRepId"),
  assignedPmId: int("assignedPmId"),
  quoteSubmittedAt: timestamp("quoteSubmittedAt"),
  approvedAt: timestamp("approvedAt"),
  orderedAt: timestamp("orderedAt"),
  targetDeliveryAt: timestamp("targetDeliveryAt"),
  deliveredAt: timestamp("deliveredAt"),
  installedAt: timestamp("installedAt"),
  completedAt: timestamp("completedAt"),
  isArchived: boolean("isArchived").default(false).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── Project Team Members ─────────────────────────────────────────────────────
export const projectTeam = mysqlTable("project_team", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  role: varchar("role", { length: 128 }),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type ProjectTeam = typeof projectTeam.$inferSelect;

// ─── Products / Line Items ────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  manufacturerId: int("manufacturerId"),
  manufacturerName: varchar("manufacturerName", { length: 255 }),
  modelNumber: varchar("modelNumber", { length: 255 }),
  description: text("description"),
  category: varchar("category", { length: 128 }),
  quantity: int("quantity").default(1).notNull(),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
  cutSheetUrl: text("cutSheetUrl"),
  specUrl: text("specUrl"),
  status: mysqlEnum("status", [
    "specified",
    "submitted",
    "approved",
    "ordered",
    "shipped",
    "delivered",
    "installed",
  ]).default("specified"),
  orderStatus: varchar("orderStatus", { length: 128 }),
  notes: text("notes"),
  sortOrder: int("sortOrder").default(0),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Documents ────────────────────────────────────────────────────────────────
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", [
    "spec_sheet",
    "submittal",
    "approval",
    "change_order",
    "invoice",
    "cut_sheet",
    "as_built",
    "warranty",
    "field_photo",
    "marketing_materials",
    "case_study",
    "other",
  ]).default("other"),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  fileName: varchar("fileName", { length: 255 }),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: int("fileSize"),
  version: int("version").default(1).notNull(),
  currentVersion: int("currentVersion").default(1).notNull(),
  parentDocumentId: int("parentDocumentId"),
  status: mysqlEnum("status", ["draft", "pending_review", "approved", "rejected", "archived"])
    .default("draft")
    .notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── Milestones ───────────────────────────────────────────────────────────────
export const milestones = mysqlTable("milestones", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", [
    "quote_submitted",
    "quote_approved",
    "order_placed",
    "in_production",
    "shipped",
    "delivered",
    "installed",
    "project_complete",
    "custom",
  ]).default("custom"),
  targetDate: timestamp("targetDate"),
  actualDate: timestamp("actualDate"),
  status: mysqlEnum("status", ["pending", "on_track", "at_risk", "delayed", "complete"]).default(
    "pending"
  ),
  notes: text("notes"),
  sortOrder: int("sortOrder").default(0),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = typeof milestones.$inferInsert;

// ─── Budget Items ─────────────────────────────────────────────────────────────
export const budgetItems = mysqlTable("budget_items", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  productId: int("productId"),
  description: varchar("description", { length: 255 }).notNull(),
  category: varchar("category", { length: 128 }),
  originalAmount: decimal("originalAmount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal("currentAmount", { precision: 12, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["original", "change_order", "credit", "allowance"]).default("original"),
  changeOrderId: int("changeOrderId"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BudgetItem = typeof budgetItems.$inferSelect;
export type InsertBudgetItem = typeof budgetItems.$inferInsert;

// ─── Change Orders ────────────────────────────────────────────────────────────
export const changeOrders = mysqlTable("change_orders", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  number: varchar("number", { length: 64 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  requestedBy: int("requestedBy").notNull(),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "rejected"]).default(
    "draft"
  ),
  costImpact: decimal("costImpact", { precision: 12, scale: 2 }),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectedReason: text("rejectedReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChangeOrder = typeof changeOrders.$inferSelect;
export type InsertChangeOrder = typeof changeOrders.$inferInsert;

// ─── Submittals ───────────────────────────────────────────────────────────────
export const submittals = mysqlTable("submittals", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  documentId: int("documentId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  submittedBy: int("submittedBy").notNull(),
  reviewedBy: int("reviewedBy"),
  status: mysqlEnum("status", [
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "needs_revision",
    "resubmitted",
  ]).default("draft"),
  comments: text("comments"),
  revisionNumber: int("revisionNumber").default(1),
  dueDate: timestamp("dueDate"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Submittal = typeof submittals.$inferSelect;
export type InsertSubmittal = typeof submittals.$inferInsert;

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  parentId: int("parentId"),
  content: text("content").notNull(),
  authorId: int("authorId").notNull(),
  linkedDocumentId: int("linkedDocumentId"),
  linkedMilestoneId: int("linkedMilestoneId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  type: mysqlEnum("type", [
    "submittal_decision",
    "milestone_update",
    "budget_change",
    "new_document",
    "new_message",
    "change_order",
    "project_update",
    "system",
  ]).default("system"),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  isRead: boolean("isRead").default(false).notNull(),
  actionUrl: text("actionUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Activity Log ─────────────────────────────────────────────────────────────
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  projectId: int("projectId"),
  action: varchar("action", { length: 128 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;

// ─── Invite Tokens ────────────────────────────────────────────────────────────
export const inviteTokens = mysqlTable("invite_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  inviteCode: varchar("inviteCode", { length: 128 }).notNull(),
  role: mysqlEnum("role", [
    "sls_admin",
    "sls_rep",
    "sls_pm",
    "client_architect",
    "client_gc",
    "user",
  ])
    .default("user")
    .notNull(),
  label: varchar("label", { length: 255 }),
  createdBy: int("createdBy").notNull(),
  usedBy: int("usedBy"),
  expiresAt: timestamp("expiresAt"),
  usedAt: timestamp("usedAt"),
  isRevoked: boolean("isRevoked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Optional: auto-assign to a project on redemption
  projectId: int("projectId"),
  projectRole: varchar("projectRole", { length: 64 }),
});
export type InviteToken = typeof inviteTokens.$inferSelect;
export type InsertInviteToken = typeof inviteTokens.$inferInsert;

// ─── Document Versions ────────────────────────────────────────────────────────
export const documentVersions = mysqlTable("document_versions", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  fileName: varchar("fileName", { length: 255 }),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: int("fileSize"),
  uploadedBy: int("uploadedBy").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;
