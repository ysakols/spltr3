import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';

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
  const [membersChanged, setMembersChanged] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch members of the group
  const { data: members = [] } = useQuery<User[]>({
    queryKey: [`/api/groups/${group.id}/members`]
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      name: group.name,
      description: group.description
    }
  });
  
  const handleAddMember = () => {
    if (!newMember.trim()) return;
    
    // We'll post this username to create a new user and add them to the group
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
  
  const handleRemoveMember = (user: User) => {
    apiRequest('DELETE', `/api/groups/${group.id}/members/${user.id}`)
      .then(() => {
        // Mark members as changed (to enable save button)
        setMembersChanged(true);
        
        // Refresh the member list
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${group.id}/members`] });
        
        toast({
          title: 'Member removed',
          description: `${user.username} has been removed from the group.`
        });
      })
      .catch((error) => {
        console.error('Error removing member:', error);
        toast({
          title: 'Error',
          description: 'Failed to remove member from the group.',
          variant: 'destructive'
        });
      });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMember();
    }
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    console.log('Submitting form with data:', data, 'Group ID:', group.id);
    
    try {
      // Force proper form validation before submission
      if (!data.name || data.name.trim() === '') {
        throw new Error('Group name is required');
      }
      
      console.log('Sending PUT request to', `/api/groups/${group.id}`);
      const response = await apiRequest('PUT', `/api/groups/${group.id}`, data);
      console.log('Response received:', response);
      
      const updatedGroup = await response.json();
      console.log('Group updated successfully:', updatedGroup);
      
      // Invalidate the group query to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${group.id}`] });
      
      // Reset the members changed flag
      setMembersChanged(false);
      
      toast({
        title: 'Group updated',
        description: `Group "${data.name}" has been updated.`,
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
  
  // Helper function to check if form has any changes
  const hasChanges = form.formState.isDirty || membersChanged;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Group</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="mb-4">
            <Label htmlFor="name" className="block mb-2">Group Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="e.g., Roommates"
              className="w-full"
            />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="mb-6">
            <Label className="block mb-2">Group Members</Label>
            
            <div className="flex space-x-2 mb-2">
              <Input
                placeholder="Add a member"
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
                      <span>{member.username}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveMember(member)}
                        className="ml-2 text-gray-600 hover:text-gray-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !hasChanges}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default EditGroupForm;