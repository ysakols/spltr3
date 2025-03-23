import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (keeping the existing one as it may be used elsewhere)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Groups table
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  people: text("people").array().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paidBy: text("paidBy").notNull(),
  splitWith: text("splitWith").array().notNull(),
  date: timestamp("date").defaultNow().notNull(),
  groupId: integer("groupId").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  people: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  description: true,
  amount: true,
  paidBy: true,
  splitWith: true,
  groupId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// Settlement type (not stored in database)
export type Settlement = {
  from: string;
  to: string;
  amount: number;
};

// Balance type (not stored in database)
export type Balance = {
  paid: Record<string, number>;
  owes: Record<string, number>;
  balances: Record<string, number>;
  settlements: Settlement[];
  totalExpenses: number;
};
