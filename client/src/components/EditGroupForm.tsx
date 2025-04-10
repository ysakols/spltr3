import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Mail, User as UserIcon, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import type { Group, User } from '@shared/schema';
import { insertGroupSchema } from '@shared/schema';

// Updated schema for the form with name and description
const editGroupSchema = insertGroupSchema.extend({
  description: z.string().nullable().optional(),
  // We're only including name and description in the schema
  // since members are handled separately via API calls
});

type FormValues = z.infer<typeof editGroupSchema>;

interface EditGroupFormProps {
  group: Group;
  onGroupUpdated: () => void;
  onCancel: () => void;
}

function EditGroupForm({ group, onGroupUpdated, onCancel }: EditGroupFormProps) {
  const [loading, setLoading] = useState(false);
  const [newMember, setNewMember] = useState('');
  const [nameInput, setNameInput] = useState(group.name);
  const [descriptionInput, setDescriptionInput] = useState(group.description || '');
  const [membersChanged, setMembersChanged] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Fetch members of the group
  const { data: members = [] } = useQuery<User[]>({
    queryKey: [`/api/groups/${group.id}/members`]
  });
  
  // Manual form handling instead of using react-hook-form
  const handleAddMember = () => {
    if (!newMember.trim()) return;
    
    // Send the email as the username parameter (the API expects email for lookup)
    apiRequest('POST', `/api/groups/${group.id}/members`, { username: newMember.trim() })
      .then(() => {
        // Mark members as changed (to enable save button)
        setMembersChanged(true);
        
        // Refresh the member list
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${group.id}/members`] });
        
        toast({
          title: 'Member added',
          description: `${newMember.trim()} has been added to the group.`
        });
        
        // Clear the input
        setNewMember('');
      })
      .catch((error) => {
        console.error('Error adding member:', error);
        toast({
          title: 'Error',
          description: 'Failed to add member to the group.',
          variant: 'destructive'
        });
      });
  };
  
  const confirmRemoveMember = (user: User) => {
    setMemberToRemove(user);
  };
  
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    setRemovingMember(true);
    
    try {
      await apiRequest('DELETE', `/api/groups/${group.id}/members/${memberToRemove.id}`);
      
      // Mark members as changed (to enable save button)
      setMembersChanged(true);
      
      // Refresh the member list
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${group.id}/members`] });
      
      toast({
        title: 'Member removed',
        description: `${memberToRemove.first_name && memberToRemove.last_name 
          ? `${memberToRemove.first_name} ${memberToRemove.last_name}` 
          : memberToRemove.display_name || memberToRemove.email} has been removed from the group.`
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member from the group.',
        variant: 'destructive'
      });
    } finally {
      setRemovingMember(false);
      setMemberToRemove(null);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMember();
    }
  };

  // Directly save changes without using react-hook-form
  const handleSaveChanges = async () => {
    setLoading(true);
    
    try {
      // Force proper form validation before submission
      if (!nameInput || nameInput.trim() === '') {
        toast({
          title: 'Error',
          description: 'Group name is required',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      console.log('Saving changes for group:', group.id);
      console.log('New name:', nameInput);
      console.log('New description:', descriptionInput);
      
      // Create data object for API
      const updateData = {
        name: nameInput.trim(),
        description: descriptionInput.trim() || null
      };
      
      console.log('Sending PUT request with data:', updateData);
      
      // Use fetch directly instead of apiRequest
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }
      
      const updatedGroup = await response.json();
      console.log('Group updated successfully:', updatedGroup);
      
      // Invalidate the group query to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${group.id}`] });
      
      // Reset the members changed flag
      setMembersChanged(false);
      
      toast({
        title: 'Group updated',
        description: `Group "${nameInput}" has been updated.`,
      });
      
      // Close the dialog by calling the onGroupUpdated callback
      onGroupUpdated();
    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to update group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle group deletion
  const handleDeleteGroup = async () => {
    try {
      setIsDeleting(true);
      await apiRequest('DELETE', `/api/groups/${group.id}`);
      toast({
        title: "Group deleted",
        description: "The group has been successfully deleted.",
      });
      // Redirect to the groups list page
      setLocation('/');
      // Invalidate the groups list cache
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Error deleting group",
        description: "There was a problem deleting the group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if there are any changes to enable the save button
  const hasChanges = 
    nameInput !== group.name || 
    descriptionInput !== (group.description || '') || 
    membersChanged;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Group</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="mb-4">
            <Label htmlFor="name" className="block mb-2">Group Name</Label>
            <Input
              id="name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g., Roommates"
              className="w-full"
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="description" className="block mb-2">Description</Label>
            <Input
              id="description"
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              placeholder="Optional description"
              className="w-full"
            />
          </div>

          <div>
            <Label className="block mb-2">Group Members</Label>
            
            <div className="flex space-x-2 mb-2">
              <Input
                placeholder="Enter email address"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={handleAddMember} 
                disabled={!newMember.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            
            {/* Current members */}
            <div className="mt-4">
              <p className="text-xs font-medium mb-2">Current Members:</p>
              {members.length === 0 ? (
                <p className="text-sm text-gray-500">No members yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <div 
                      key={member.id} 
                      className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center"
                    >
                      <span>
                        {member.first_name && member.last_name 
                          ? `${member.first_name} ${member.last_name}` 
                          : member.display_name || member.email}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger>
                          <button 
                            type="button" 
                            className="ml-2 text-gray-600 hover:text-gray-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              Remove Member
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this member from the group?
                              <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                <p className="font-medium">
                                  {member.first_name && member.last_name 
                                    ? `${member.first_name} ${member.last_name}` 
                                    : member.display_name || member.email}
                                </p>
                              </div>
                              Once removed, they will no longer have access to this group.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => {
                                confirmRemoveMember(member);
                                handleRemoveMember();
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {removingMember && memberToRemove?.id === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : <X className="h-4 w-4 mr-2" />}
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            {/* Danger Zone */}
            <div className="flex items-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="flex items-center gap-1 h-8 py-0 px-2"
                  >
                    <Trash2 className="h-4 w-4" /> 
                    Delete Group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Delete Group
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this group? This will permanently remove 
                      <strong> {group.name}</strong> and all its expenses. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteGroup}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : <Trash2 className="h-4 w-4 mr-2" />}
                      Delete Group
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                disabled={loading || !hasChanges}
                onClick={handleSaveChanges}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EditGroupForm;