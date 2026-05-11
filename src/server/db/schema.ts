/**
 * The GRID — full database schema.
 * Spec §4 (13 tables). Ported from Drizzle/MySQL to Drizzle/Postgres (Supabase).
 *
 * Foreign keys ARE enforced at the database level in this Postgres port,
 * unlike the original MySQL build (spec §4 noted FKs were app-layer only).
 */
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "sls_admin",
  "sls_rep",
  "sls_pm",
  "client_architect",
  "client_gc",
  "user",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

export const projectPhaseEnum = pgEnum("project_phase", [
  "design",
  "spec",
  "submittal",
  "procurement",
  "installation",
  "closeout",
]);

export const productStatusEnum = pgEnum("product_status", [
  "specified",
  "submitted",
  "approved",
  "ordered",
  "delivered",
  "installed",
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "submittal",
  "spec_sheet",
  "cut_sheet",
  "as_built",
  "contract",
  "photo",
  "other",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pending",
  "in_progress",
  "completed",
  "delayed",
  "cancelled",
]);

export const budgetItemTypeEnum = pgEnum("budget_item_type", [
  "original",
  "change_order",
  "credit",
  "allowance",
]);

export const changeOrderStatusEnum = pgEnum("change_order_status", [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
]);

export const submittalStatusEnum = pgEnum("submittal_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "needs_revision",
  "resubmitted",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "submittal_decision",
  "milestone_update",
  "budget_change",
  "new_document",
  "new_message",
  "change_order",
  "project_update",
  "system",
]);

// ─── 4.1 users ────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").notNull().default("user"),
  company: varchar("company", { length: 255 }),
  title: varchar("title", { length: 255 }),
  phone: varchar("phone", { length: 64 }),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.2 projects ─────────────────────────────────────────────────────────
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("active"),
  phase: projectPhaseEnum("phase").notNull().default("design"),
  clientCompany: varchar("client_company", { length: 255 }),
  clientContact: varchar("client_contact", { length: 255 }),
  location: varchar("location", { length: 255 }),
  startDate: timestamp("start_date", { withTimezone: true }),
  targetCompletionDate: timestamp("target_completion_date", { withTimezone: true }),
  actualCompletionDate: timestamp("actual_completion_date", { withTimezone: true }),
  originalBudget: decimal("original_budget", { precision: 12, scale: 2 }),
  currentBudget: decimal("current_budget", { precision: 12, scale: 2 }),
  assignedRepId: integer("assigned_rep_id").references(() => users.id),
  assignedPmId: integer("assigned_pm_id").references(() => users.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.3 project_team ─────────────────────────────────────────────────────
export const projectTeam = pgTable("project_team", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 128 }),
  addedBy: integer("added_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.4 manufacturers ────────────────────────────────────────────────────
export const manufacturers = pgTable("manufacturers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  website: varchar("website", { length: 255 }),
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  contactPhone: varchar("contact_phone", { length: 64 }),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.5 products ─────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  manufacturerId: integer("manufacturer_id").references(() => manufacturers.id),
  name: varchar("name", { length: 255 }).notNull(),
  modelNumber: varchar("model_number", { length: 255 }),
  description: text("description"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }),
  status: productStatusEnum("status").notNull().default("specified"),
  leadTime: varchar("lead_time", { length: 128 }),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.6 documents ────────────────────────────────────────────────────────
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  fileKey: varchar("file_key", { length: 500 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 128 }),
  fileSize: integer("file_size"),
  category: documentCategoryEnum("category").notNull().default("other"),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.7 milestones ───────────────────────────────────────────────────────
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedDate: timestamp("completed_date", { withTimezone: true }),
  status: milestoneStatusEnum("status").notNull().default("pending"),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.9 change_orders (declared before budget_items because of FK) ───────
export const changeOrders = pgTable("change_orders", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  number: varchar("number", { length: 64 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  requestedBy: integer("requested_by").notNull().references(() => users.id),
  status: changeOrderStatusEnum("status").notNull().default("draft"),
  costImpact: decimal("cost_impact", { precision: 12, scale: 2 }),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.8 budget_items ─────────────────────────────────────────────────────
export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id),
  description: varchar("description", { length: 255 }).notNull(),
  category: varchar("category", { length: 128 }),
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 12, scale: 2 }).notNull(),
  type: budgetItemTypeEnum("type").notNull().default("original"),
  changeOrderId: integer("change_order_id").references(() => changeOrders.id),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.10 submittals ──────────────────────────────────────────────────────
export const submittals = pgTable("submittals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  documentId: integer("document_id").references(() => documents.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  submittedBy: integer("submitted_by").notNull().references(() => users.id),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  status: submittalStatusEnum("status").notNull().default("draft"),
  comments: text("comments"),
  revisionNumber: integer("revision_number").notNull().default(1),
  dueDate: timestamp("due_date", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.11 messages ────────────────────────────────────────────────────────
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull().references(() => users.id),
  linkedDocumentId: integer("linked_document_id").references(() => documents.id),
  linkedMilestoneId: integer("linked_milestone_id").references(() => milestones.id),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.12 notifications ───────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  type: notificationTypeEnum("type").notNull().default("system"),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  isRead: boolean("is_read").notNull().default(false),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── 4.13 activity_log ────────────────────────────────────────────────────
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  action: varchar("action", { length: 128 }).notNull(),
  entityType: varchar("entity_type", { length: 64 }),
  entityId: integer("entity_id"),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  createdProjects: many(projects, { relationName: "createdProjects" }),
  teamMemberships: many(projectTeam),
  notifications: many(notifications),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  rep: one(users, { fields: [projects.assignedRepId], references: [users.id], relationName: "rep" }),
  pm: one(users, { fields: [projects.assignedPmId], references: [users.id], relationName: "pm" }),
  creator: one(users, { fields: [projects.createdBy], references: [users.id], relationName: "createdProjects" }),
  team: many(projectTeam),
  products: many(products),
  documents: many(documents),
  milestones: many(milestones),
  budgetItems: many(budgetItems),
  submittals: many(submittals),
  messages: many(messages),
  changeOrders: many(changeOrders),
}));

export const projectTeamRelations = relations(projectTeam, ({ one }) => ({
  project: one(projects, { fields: [projectTeam.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectTeam.userId], references: [users.id] }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  project: one(projects, { fields: [products.projectId], references: [projects.id] }),
  manufacturer: one(manufacturers, { fields: [products.manufacturerId], references: [manufacturers.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  project: one(projects, { fields: [documents.projectId], references: [projects.id] }),
  uploader: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(projects, { fields: [milestones.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [milestones.assignedTo], references: [users.id] }),
}));

export const budgetItemsRelations = relations(budgetItems, ({ one }) => ({
  project: one(projects, { fields: [budgetItems.projectId], references: [projects.id] }),
  product: one(products, { fields: [budgetItems.productId], references: [products.id] }),
  changeOrder: one(changeOrders, { fields: [budgetItems.changeOrderId], references: [changeOrders.id] }),
}));

export const changeOrdersRelations = relations(changeOrders, ({ one }) => ({
  project: one(projects, { fields: [changeOrders.projectId], references: [projects.id] }),
  requester: one(users, { fields: [changeOrders.requestedBy], references: [users.id] }),
  approver: one(users, { fields: [changeOrders.approvedBy], references: [users.id] }),
}));

export const submittalsRelations = relations(submittals, ({ one }) => ({
  project: one(projects, { fields: [submittals.projectId], references: [projects.id] }),
  document: one(documents, { fields: [submittals.documentId], references: [documents.id] }),
  submitter: one(users, { fields: [submittals.submittedBy], references: [users.id] }),
  reviewer: one(users, { fields: [submittals.reviewedBy], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  project: one(projects, { fields: [messages.projectId], references: [projects.id] }),
  author: one(users, { fields: [messages.authorId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  project: one(projects, { fields: [notifications.projectId], references: [projects.id] }),
}));

// ─── Convenience types ───────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Product = typeof products.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type BudgetItem = typeof budgetItems.$inferSelect;
export type ChangeOrder = typeof changeOrders.$inferSelect;
export type Submittal = typeof submittals.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Manufacturer = typeof manufacturers.$inferSelect;
export type ProjectTeam = typeof projectTeam.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;
export type UserRole = typeof userRoleEnum.enumValues[number];

// ─── Role helpers (spec §5.2) ─────────────────────────────────────────────
export const INTERNAL_ROLES: readonly UserRole[] = ["sls_admin", "sls_rep", "sls_pm", "admin"];
export const ADMIN_ROLES: readonly UserRole[] = ["sls_admin", "admin"];
export const PM_ROLES: readonly UserRole[] = ["sls_pm", "sls_admin", "admin"];
