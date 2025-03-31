import { migrateToUnifiedSystem } from './server/migrateToUnifiedSystem';

async function runMigration() {
  try {
    console.log('Starting migration process...');
    const result = await migrateToUnifiedSystem();
    console.log('Migration completed successfully!');
    console.log('Statistics:');
    console.log(`Total expenses: ${result.totalExpenses}, Migrated: ${result.migratedExpenses}`);
    console.log(`Total settlements: ${result.totalSettlements}, Migrated: ${result.migratedSettlements}`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();