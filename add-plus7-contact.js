// Direct fix script to add the missing yair.sakols+7@gmail.com contact
// Run this with: node add-plus7-contact.js

import pg from 'pg';
const { Pool } = pg;

// Initialize connection to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addPlusSeven() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('Starting fix for yair.sakols+7@gmail.com contact');
    
    // Print all users for debugging
    console.log('ALL USERS IN THE SYSTEM:');
    const allUsersResult = await client.query(`SELECT id, email FROM users ORDER BY id`);
    allUsersResult.rows.forEach(user => {
      console.log(`User ID: ${user.id}, Email: ${user.email}`);
    });
    
    // Check all user_groups to see if there are any mentions of the missing user
    console.log('\nCHECKING ALL USER_GROUPS:');
    const userGroupsResult = await client.query(`SELECT * FROM user_groups ORDER BY group_id`);
    userGroupsResult.rows.forEach(userGroup => {
      console.log(`Group ID: ${userGroup.group_id}, User ID: ${userGroup.user_id}`);
    });
    
    // Check all groups
    console.log('\nCHECKING ALL GROUPS:');
    const groupsResult = await client.query(`SELECT * FROM groups ORDER BY id`);
    groupsResult.rows.forEach(group => {
      console.log(`Group ID: ${group.id}, Name: ${group.name}, Created by: ${group.created_by_id}`);
    });
    
    // Check all invitations
    console.log('\nCHECKING ALL INVITATIONS:');
    const invitationsResult = await client.query(
      `SELECT id, group_id, inviter_user_id, invitee_email, status, token
       FROM group_invitations`
    );
    invitationsResult.rows.forEach(invitation => {
      console.log(`Invitation ID: ${invitation.id}, Group ID: ${invitation.group_id}, ` +
                 `Inviter: ${invitation.inviter_user_id}, Invitee: ${invitation.invitee_email}, ` +
                 `Status: ${invitation.status}, Token: ${invitation.token}`);
    });
    
    // 1. Check if this user exists in the system 
    const userResult = await client.query(
      `SELECT * FROM users WHERE email LIKE '%yair.sakols+7@gmail.com%'`
    );
    
    if (userResult.rows.length === 0) {
      console.log('ERROR: Could not find user with email yair.sakols+7@gmail.com in the database');
      console.log('Cannot proceed with the fix - the user must first be created in the system');
      return;
    }
    
    const targetUser = userResult.rows[0];
    console.log(`Found user: ${targetUser.email} (ID: ${targetUser.id})`);
    
    // 2. Get the currently logged in user (should be user ID 12 - Yair)
    const currentUserId = 12; // Based on the API logs showing currentUserId=12
    const currentUserResult = await client.query(
      `SELECT * FROM users WHERE id = $1`,
      [currentUserId]
    );
    
    if (currentUserResult.rows.length === 0) {
      console.log(`ERROR: Current user ID ${currentUserId} not found`);
      return;
    }
    
    const currentUser = currentUserResult.rows[0];
    console.log(`Current user: ${currentUser.email} (ID: ${currentUser.id})`);
    
    // 3. Check if contact already exists
    const existingContactResult = await client.query(
      `SELECT * FROM contacts WHERE user_id = $1 AND contact_user_id = $2`,
      [currentUserId, targetUser.id]
    );
    
    if (existingContactResult.rows.length > 0) {
      console.log(`Contact already exists between ${currentUser.email} and ${targetUser.email}`);
      console.log('Details:', existingContactResult.rows[0]);
      return;
    }
    
    // 4. Add the contact
    const now = new Date();
    const insertResult = await client.query(
      `INSERT INTO contacts (user_id, contact_user_id, email, frequency, last_interaction_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [currentUserId, targetUser.id, targetUser.email, 1, now]
    );
    
    console.log('Successfully created contact:');
    console.log(insertResult.rows[0]);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Transaction committed. Contact has been added.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in transaction, rolled back:', error);
  } finally {
    client.release();
  }
}

// Run the fix
addPlusSeven().then(() => {
  console.log('Fix script completed.');
  process.exit(0);
}).catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});