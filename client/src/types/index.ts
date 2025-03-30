import { Group as BaseGroup, User, Expense as BaseExpense } from '@shared/schema';

// Extend the base Group type with additional properties that may be returned by the API
export interface ExtendedGroup extends BaseGroup {
  creatorInfo?: User;
  members?: User[];
}

// Extend the base Expense type with additional user information
export interface ExtendedExpense extends BaseExpense {
  paidByUser?: User;
  createdByUser?: User;
}