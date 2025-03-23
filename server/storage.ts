import { groups, expenses, type Group, type InsertGroup, type Expense, type InsertExpense, type Balance, type Settlement, SplitType } from "@shared/schema";

export interface IStorage {
  // User methods (keeping the existing ones)
  getUser(id: number): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  
  // Group methods
  getGroups(): Promise<Group[]>;
  getGroup(id: number): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: number, group: Partial<InsertGroup>): Promise<Group | undefined>;
  
  // Expense methods
  getExpenses(groupId: number): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: number): Promise<boolean>;
  
  // Summary method
  calculateSummary(groupId: number): Promise<Balance>;
}

export class MemStorage implements IStorage {
  private users: Map<number, any>;
  private groupStore: Map<number, Group>;
  private expenseStore: Map<number, Expense>;
  
  private userCurrentId: number;
  private groupCurrentId: number;
  private expenseCurrentId: number;

  constructor() {
    this.users = new Map();
    this.groupStore = new Map();
    this.expenseStore = new Map();
    
    this.userCurrentId = 1;
    this.groupCurrentId = 1;
    this.expenseCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<any | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: any): Promise<any> {
    const id = this.userCurrentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Group methods
  async getGroups(): Promise<Group[]> {
    return Array.from(this.groupStore.values());
  }
  
  async getGroup(id: number): Promise<Group | undefined> {
    return this.groupStore.get(id);
  }
  
  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const id = this.groupCurrentId++;
    const now = new Date();
    const group: Group = { 
      ...insertGroup, 
      id, 
      createdAt: now 
    };
    this.groupStore.set(id, group);
    return group;
  }
  
  async updateGroup(id: number, updateData: Partial<InsertGroup>): Promise<Group | undefined> {
    const existingGroup = this.groupStore.get(id);
    
    if (!existingGroup) {
      return undefined;
    }
    
    const updatedGroup: Group = {
      ...existingGroup,
      ...updateData
    };
    
    this.groupStore.set(id, updatedGroup);
    return updatedGroup;
  }
  
  // Expense methods
  async getExpenses(groupId: number): Promise<Expense[]> {
    return Array.from(this.expenseStore.values())
      .filter(expense => expense.groupId === groupId);
  }
  
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenseStore.get(id);
  }
  
  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.expenseCurrentId++;
    const now = new Date();
    const expense: Expense = {
      ...insertExpense,
      id,
      date: now,
      splitType: (insertExpense.splitType as string) || 'equal',
      splitDetails: insertExpense.splitDetails || '{}'
    };
    this.expenseStore.set(id, expense);
    return expense;
  }
  
  async updateExpense(id: number, updateData: InsertExpense): Promise<Expense> {
    const existingExpense = this.expenseStore.get(id);
    if (!existingExpense) {
      throw new Error(`Expense with ID ${id} not found`);
    }
    
    const updatedExpense: Expense = {
      ...existingExpense,
      ...updateData,
      date: existingExpense.date, // Preserve the original date
      id: existingExpense.id // Ensure ID doesn't change
    };
    
    this.expenseStore.set(id, updatedExpense);
    return updatedExpense;
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    return this.expenseStore.delete(id);
  }
  
  // Calculate summary for a group
  async calculateSummary(groupId: number): Promise<Balance> {
    const group = await this.getGroup(groupId);
    if (!group) {
      throw new Error('Group not found');
    }
    
    const expenses = await this.getExpenses(groupId);
    
    // Calculate what each person paid
    const paid: Record<string, number> = {};
    group.people.forEach(person => {
      paid[person] = 0;
    });
    
    expenses.forEach(expense => {
      const amount = Number(expense.amount);
      paid[expense.paidBy] = (paid[expense.paidBy] || 0) + amount;
    });
    
    // Calculate what each person owes
    const owes: Record<string, number> = {};
    group.people.forEach(person => {
      owes[person] = 0;
    });
    
    expenses.forEach(expense => {
      const amount = Number(expense.amount);
      const splitType = expense.splitType;
      let splitDetails: Record<string, number> = {};
      
      try {
        // Parse splitDetails JSON if available
        if (expense.splitDetails && expense.splitDetails !== '{}') {
          splitDetails = JSON.parse(expense.splitDetails);
        }
      } catch (error) {
        console.error('Error parsing splitDetails:', error);
        // Fall back to equal split if there's an error parsing
        splitDetails = {};
      }
      
      // Handle different split types
      if (splitType === 'percentage') {
        // Split by percentage
        expense.splitWith.forEach(person => {
          const percentage = splitDetails[person] || (100 / expense.splitWith.length);
          const personAmount = (amount * percentage) / 100;
          owes[person] = (owes[person] || 0) + personAmount;
        });
      } else if (splitType === 'exact') {
        // Split by exact amounts
        expense.splitWith.forEach(person => {
          const exactAmount = splitDetails[person] || 0;
          owes[person] = (owes[person] || 0) + exactAmount;
        });
      } else {
        // Default: Split equally
        const splitCount = expense.splitWith.length || 1;
        const perPersonAmount = amount / splitCount;
        
        expense.splitWith.forEach(person => {
          owes[person] = (owes[person] || 0) + perPersonAmount;
        });
      }
    });
    
    // Calculate net balances
    const balances: Record<string, number> = {};
    group.people.forEach(person => {
      balances[person] = paid[person] - owes[person];
    });
    
    // Generate settlement plan
    const settlements = this.generateSettlements(balances);
    
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    
    return {
      paid,
      owes,
      balances,
      settlements,
      totalExpenses
    };
  }
  
  // Helper function to generate settlements
  private generateSettlements(balances: Record<string, number>): Settlement[] {
    const settlements: Settlement[] = [];
    
    // Identify debtors and creditors
    const debtors: { name: string; amount: number }[] = [];
    const creditors: { name: string; amount: number }[] = [];
    
    Object.keys(balances).forEach(person => {
      if (balances[person] < -0.01) {
        debtors.push({ name: person, amount: Math.abs(balances[person]) });
      } else if (balances[person] > 0.01) {
        creditors.push({ name: person, amount: balances[person] });
      }
    });
    
    // Sort by amount (largest first)
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);
    
    // Generate settlement plan
    debtors.forEach(debtor => {
      let remaining = debtor.amount;
      
      for (let i = 0; i < creditors.length && remaining > 0.01; i++) {
        const creditor = creditors[i];
        
        if (creditor.amount > 0.01) {
          const amount = Math.min(remaining, creditor.amount);
          
          settlements.push({
            from: debtor.name,
            to: creditor.name,
            amount: Math.round(amount * 100) / 100
          });
          
          remaining -= amount;
          creditors[i].amount -= amount;
        }
      }
    });
    
    return settlements;
  }
}

export const storage = new MemStorage();
