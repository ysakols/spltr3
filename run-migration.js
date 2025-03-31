import { migrateToUnifiedSystem } from './server/migrateToUnifiedSystem.js';

// Run the migration directly from Node.js
async function runMigration() {
  try {
    console.log('Starting migration process...');
    const result = await migrateToUnifiedSystem();
    console.log('Migration completed successfully!');
    console.log('Statistics:');
    console.log(`Total expenses: ${result.totalExpenses}, Migrated: ${result.migratedExpenses}`);
    console.log(`Total settlements: ${result.totalSettlements}, Migrated: ${result.migratedSettlements}`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
runMigration();