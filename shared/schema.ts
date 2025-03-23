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

// Split types enum
export enum SplitType {
  EQUAL = 'equal',
  PERCENTAGE = 'percentage',
  EXACT = 'exact'
}

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paidBy: text("paidBy").notNull(),
  splitWith: text("splitWith").array().notNull(),
  splitType: text("splitType").notNull().default(SplitType.EQUAL),
  splitDetails: text("splitDetails").notNull().default('{}'), // JSON string with split allocations
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

export const insertExpenseSchema = createInsertSchema(expenses)
  .pick({
    description: true,
    amount: true,
    paidBy: true,
    splitWith: true,
    groupId: true,
    splitType: true,
    splitDetails: true,
  })
  .extend({
    // Extend the schema to coerce the amount to a string since Drizzle expects it that way
    amount: z.coerce.string(),
    // Make splitType optional with a default of EQUAL
    splitType: z.nativeEnum(SplitType).default(SplitType.EQUAL).optional(),
    // Make splitDetails optional with a default empty object
    splitDetails: z.string().default('{}').optional(),
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
