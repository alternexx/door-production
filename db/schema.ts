import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  date,
  uniqueIndex,
  numeric,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique().notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "agent"] })
    .notNull()
    .default("agent"),
  isActive: boolean("is_active").notNull().default(true),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealType: text("deal_type", {
    enum: ["rental", "seller", "buyer", "application", "tenant_rep"],
  }).notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  orderIndex: integer("order_index").notNull(),
  isClosedWon: boolean("is_closed_won").notNull().default(false),
  isClosedLost: boolean("is_closed_lost").notNull().default(false),
  staleThresholdDays: integer("stale_threshold_days"),
  outcome: text("outcome", { enum: ["win", "loss", "na"] }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealType: text("deal_type", {
    enum: ["rental", "seller", "buyer", "application", "tenant_rep"],
  }).notNull(),
  title: text("title").notNull(),
  address: text("address").notNull(),
  unit: text("unit"),
  borough: text("borough").notNull(),
  neighborhood: text("neighborhood"),
  zip: text("zip"),
  buildingId: uuid("building_id").references(() => buildings.id),
  price: integer("price"),
  status: text("status", { enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  source: text("source", {
    enum: [
      "cold_call",
      "referral",
      "streeteasy",
      "zillow",
      "walk_in",
      "social",
      "website",
      "other",
    ],
  }),
  notes: text("notes"),
  stageId: uuid("stage_id")
    .notNull()
    .references(() => pipelineStages.id),
  leaseStartDate: date("lease_start_date"),
  leaseEndDate: date("lease_end_date"),
  listedAt: timestamp("listed_at"),
  archivedAt: timestamp("archived_at"),
  archiveReason: text("archive_reason"),
  showingScheduledAt: timestamp("showing_scheduled_at"),
  showingAgentId: uuid("showing_agent_id").references(() => users.id),
  commission: numeric("commission", { precision: 12, scale: 2 }),
  applicationPrice: numeric("application_price", { precision: 12, scale: 2 }),
  commissionData: jsonb("commission_data"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ChecklistTemplateItem = {
  label: string;
  required: boolean;
  order: number;
};

export const checklistTemplates = pgTable("checklist_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealType: text("deal_type", {
    enum: ["rental", "seller", "buyer", "application", "tenant_rep"],
  }).notNull(),
  items: jsonb("items")
    .$type<ChecklistTemplateItem[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dealChecklistItems = pgTable(
  "deal_checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    templateItemLabel: text("template_item_label").notNull(),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    completedBy: uuid("completed_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    dealItemUnique: uniqueIndex("deal_checklist_items_deal_label_unique").on(
      table.dealId,
      table.templateItemLabel
    ),
  })
);

export const dealAgents = pgTable("deal_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  removedAt: timestamp("removed_at"),
});

export const dealStageHistory = pgTable("deal_stage_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id),
  stageId: uuid("stage_id")
    .notNull()
    .references(() => pipelineStages.id),
  stageName: text("stage_name").notNull(),
  enteredAt: timestamp("entered_at").notNull().defaultNow(),
  exitedAt: timestamp("exited_at"),
  durationSeconds: integer("duration_seconds"),
  changedBy: uuid("changed_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const dealHistory = pgTable("deal_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id),
  dealType: text("deal_type", {
    enum: ["rental", "seller", "buyer", "application", "tenant_rep"],
  }).notNull(),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedById: uuid("changed_by_id")
    .notNull()
    .references(() => users.id),
  changedByName: text("changed_by_name").notNull(),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export const showings = pgTable("showings", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status", {
    enum: ["scheduled", "completed", "cancelled", "no_show"],
  })
    .notNull()
    .default("scheduled"),
  feedbackReaction: text("feedback_reaction", {
    enum: [
      "loved_it",
      "interested",
      "too_expensive",
      "too_small",
      "bad_neighborhood",
      "wants_more",
      "not_interested",
      "other",
    ],
  }),
  feedbackNotes: text("feedback_notes"),
  signInCount: integer("sign_in_count").notNull().default(0),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  rescheduledFrom: uuid("rescheduled_from"),
  showingType: text("showing_type", { enum: ["private", "open_house"] }).notNull().default("private"),
  token: text("token"),
  propertyLabel: text("property_label"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const showingHistory = pgTable("showing_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  showingId: uuid("showing_id")
    .notNull()
    .references(() => showings.id),
  action: text("action", {
    enum: [
      "scheduled",
      "rescheduled",
      "completed",
      "feedback_added",
      "cancelled",
      "no_show",
    ],
  }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: uuid("changed_by")
    .notNull()
    .references(() => users.id),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

// ── Tasks ──────────────────────────────────────────────────────────
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  status: text("status", {
    enum: ["todo", "in_progress", "completed"],
  })
    .notNull()
    .default("todo"),
  priority: text("priority", {
    enum: ["low", "medium", "high", "urgent"],
  })
    .notNull()
    .default("medium"),
  completedAt: timestamp("completed_at"),
  completedBy: uuid("completed_by").references(() => users.id),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taskHistory = pgTable("task_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id),
  action: text("action", {
    enum: [
      "created",
      "updated",
      "completed",
      "reopened",
      "rescheduled",
      "reassigned",
      "cancelled",
    ],
  }).notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: uuid("changed_by")
    .notNull()
    .references(() => users.id),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

// ── Contact History ────────────────────────────────────────────────
export const contactHistory = pgTable("contact_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  action: text("action", {
    enum: ["created", "updated", "merged", "linked", "unlinked"],
  }).notNull(),
  dealId: uuid("deal_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: uuid("changed_by")
    .notNull()
    .references(() => users.id),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dealContacts = pgTable("deal_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  role: text("role"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const landlords = pgTable("landlords", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  preferredContact: text("preferred_contact"),
  managementCompany: text("management_company"),
  notes: text("notes"),
  coBroke: boolean("co_broke").notNull().default(false),
  coBrokeTerms: text("co_broke_terms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const buildings = pgTable("buildings", {
  id: uuid("id").primaryKey().defaultRandom(),
  address: text("address").notNull(),
  borough: text("borough").notNull(),
  neighborhood: text("neighborhood"),
  zip: text("zip"),
  landlordId: uuid("landlord_id").references(() => landlords.id),
  amenities: jsonb("amenities"),
  keyAccess: text("key_access"),
  ownerName: text("owner_name"),
  ownerPhone: text("owner_phone"),
  ownerEmail: text("owner_email"),
  managementCompany: text("management_company"),
  photos: jsonb("photos"),
  floorPlans: jsonb("floor_plans"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dealComments = pgTable("deal_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").notNull().references(() => deals.id),
  authorId: uuid("author_id").notNull().references(() => users.id),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type DealComment = typeof dealComments.$inferSelect;

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const announcementReads = pgTable("announcement_reads", {
  id: uuid("id").primaryKey().defaultRandom(),
  announcementId: uuid("announcement_id")
    .notNull()
    .references(() => announcements.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  readAt: timestamp("read_at").notNull().defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
export type DealAgent = typeof dealAgents.$inferSelect;
export type DealStageHistory = typeof dealStageHistory.$inferSelect;
export type DealHistory = typeof dealHistory.$inferSelect;

export type Showing = typeof showings.$inferSelect;
export type ShowingHistory = typeof showingHistory.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskHistory = typeof taskHistory.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type ContactHistory = typeof contactHistory.$inferSelect;
export type DealContact = typeof dealContacts.$inferSelect;
export type Landlord = typeof landlords.$inferSelect;
export type Building = typeof buildings.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type AnnouncementRead = typeof announcementReads.$inferSelect;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type DealChecklistItem = typeof dealChecklistItems.$inferSelect;

export type DealType = "rental" | "seller" | "buyer" | "application" | "tenant_rep";
export type UserRole = "admin" | "agent";
export type DealStatus = "active" | "archived";
export type DealSource =
  | "cold_call"
  | "referral"
  | "streeteasy"
  | "zillow"
  | "walk_in"
  | "social"
  | "website"
  | "other";

// ── Relations ──────────────────────────────────────────────────────

export const dealsRelations = relations(deals, ({ one, many }) => ({
  stage: one(pipelineStages, { fields: [deals.stageId], references: [pipelineStages.id] }),
  building: one(buildings, { fields: [deals.buildingId], references: [buildings.id] }),
  agents: many(dealAgents),
  creator: one(users, { fields: [deals.createdBy], references: [users.id] }),
  history: many(dealHistory),

  stageHistory: many(dealStageHistory),
  showings: many(showings),
  tasks: many(tasks),
  contacts: many(dealContacts),
  checklistItems: many(dealChecklistItems),
  comments: many(dealComments),
}));

export const dealStageHistoryRelations = relations(dealStageHistory, ({ one }) => ({
  deal: one(deals, { fields: [dealStageHistory.dealId], references: [deals.id] }),
  stage: one(pipelineStages, { fields: [dealStageHistory.stageId], references: [pipelineStages.id] }),
  changedByUser: one(users, { fields: [dealStageHistory.changedBy], references: [users.id] }),
}));

export const dealAgentsRelations = relations(dealAgents, ({ one }) => ({
  deal: one(deals, { fields: [dealAgents.dealId], references: [deals.id] }),
  user: one(users, { fields: [dealAgents.userId], references: [users.id] }),
}));

export const pipelineStagesRelations = relations(pipelineStages, ({ many }) => ({
  deals: many(deals),
}));

export const usersRelations = relations(users, ({ many }) => ({
  deals: many(deals),
  dealAgents: many(dealAgents),
  stageHistory: many(dealStageHistory),
  announcements: many(announcements),
  announcementReads: many(announcementReads),
  completedChecklistItems: many(dealChecklistItems),
}));

export const dealHistoryRelations = relations(dealHistory, ({ one }) => ({
  deal: one(deals, { fields: [dealHistory.dealId], references: [deals.id] }),
}));

export const showingsRelations = relations(showings, ({ one, many }) => ({
  deal: one(deals, { fields: [showings.dealId], references: [deals.id] }),
  agent: one(users, { fields: [showings.agentId], references: [users.id] }),
  history: many(showingHistory),
}));

export const showingHistoryRelations = relations(showingHistory, ({ one }) => ({
  showing: one(showings, { fields: [showingHistory.showingId], references: [showings.id] }),
}));

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  landlord: one(landlords, { fields: [buildings.landlordId], references: [landlords.id] }),
  deals: many(deals),
}));

export const announcementsRelations = relations(announcements, ({ one, many }) => ({
  creator: one(users, { fields: [announcements.createdBy], references: [users.id] }),
  reads: many(announcementReads),
}));

export const announcementReadsRelations = relations(announcementReads, ({ one }) => ({
  announcement: one(announcements, {
    fields: [announcementReads.announcementId],
    references: [announcements.id],
  }),
  user: one(users, { fields: [announcementReads.userId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  deal: one(deals, { fields: [tasks.dealId], references: [deals.id] }),
  assignee: one(users, { fields: [tasks.assignedTo], references: [users.id] }),
  creator: one(users, { fields: [tasks.createdBy], references: [users.id] }),
  history: many(taskHistory),
}));

export const taskHistoryRelations = relations(taskHistory, ({ one }) => ({
  task: one(tasks, { fields: [taskHistory.taskId], references: [tasks.id] }),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  deals: many(dealContacts),
  history: many(contactHistory),
}));

export const dealContactsRelations = relations(dealContacts, ({ one }) => ({
  deal: one(deals, { fields: [dealContacts.dealId], references: [deals.id] }),
  contact: one(contacts, { fields: [dealContacts.contactId], references: [contacts.id] }),
}));

export const contactHistoryRelations = relations(contactHistory, ({ one }) => ({
  contact: one(contacts, { fields: [contactHistory.contactId], references: [contacts.id] }),
}));

export const landlordsRelations = relations(landlords, ({ many }) => ({
  buildings: many(buildings),
}));

export const dealChecklistItemsRelations = relations(dealChecklistItems, ({ one }) => ({
  deal: one(deals, { fields: [dealChecklistItems.dealId], references: [deals.id] }),
  completedByUser: one(users, {
    fields: [dealChecklistItems.completedBy],
    references: [users.id],
  }),
}));

export const dealCommentsRelations = relations(dealComments, ({ one }) => ({
  deal: one(deals, { fields: [dealComments.dealId], references: [deals.id] }),
  author: one(users, { fields: [dealComments.authorId], references: [users.id] }),
}));
