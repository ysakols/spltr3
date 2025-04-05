import { Express } from "express";
import { isAuthenticated } from "../middleware/auth-middleware";
import { GroupController } from "../controllers/group-controller";

/**
 * Register group routes
 * @param app Express application
 */
export function registerGroupRoutes(app: Express): void {
  // Get all groups for the authenticated user
  app.get('/api/groups', isAuthenticated, GroupController.getUserGroups);
  
  // Create a new group
  app.post('/api/groups', isAuthenticated, GroupController.createGroup);
  
  // Get a group by ID
  app.get('/api/groups/:id', isAuthenticated, GroupController.getGroupById);
  
  // Update a group
  app.put('/api/groups/:id', isAuthenticated, GroupController.updateGroup);
  
  // Delete a group
  app.delete('/api/groups/:id', isAuthenticated, GroupController.deleteGroup);
  
  // Get group members
  app.get('/api/groups/:groupId/members', isAuthenticated, GroupController.getGroupMembers);
  
  // Add member to group
  app.post('/api/groups/:groupId/members', isAuthenticated, GroupController.addGroupMember);
  
  // Remove member from group
  app.delete('/api/groups/:groupId/members/:userId', isAuthenticated, GroupController.removeGroupMember);
  
  // Get group expenses
  app.get('/api/groups/:groupId/expenses', isAuthenticated, GroupController.getGroupExpenses);
  
  // Get group summary
  app.get('/api/groups/:groupId/summary', isAuthenticated, GroupController.getGroupSummary);
  
  // Get group invitations
  app.get('/api/groups/:groupId/invitations', isAuthenticated, GroupController.getGroupInvitations);
  
  // Create group invitation
  app.post('/api/groups/:groupId/invitations', isAuthenticated, GroupController.createGroupInvitation);
  
  // Get invitation by token
  app.get('/api/invitations/:token', GroupController.getInvitationByToken);
  
  // Respond to invitation
  app.put('/api/invitations/:id', isAuthenticated, GroupController.respondToInvitation);
  
  // Resend invitation
  app.post('/api/invitations/:id/resend', isAuthenticated, GroupController.resendInvitation);
}