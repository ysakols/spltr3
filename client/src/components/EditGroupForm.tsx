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

// We don't need people array in the schema anymore, it's managed separately via members
const editGroupSchema = insertGroupSchema.extend({
  description: z.string().nullable().optional()
});

type FormValues = z.infer<typeof editGroupSchema>;

interface EditGroupFormProps {
  group: Group;
  onGroupUpdated: () => void;
  onCancel: () => void;
}

function EditGroupForm({ group, onGroupUpdated, onCancel }: EditGroupFormProps) {
  const [loading, setLoading] = useState(false);
  const [newPerson, setNewPerson] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch members of the group
  const { data: members = [] } = useQuery<User[]>({
    queryKey: [`/api/groups/${group.id}/members`]
  });
  
  // We'll manage the members separately instead of in the form
  const [currentMembers, setCurrentMembers] = useState<User[]>([]);
  
  // Update members when the data is fetched
  useEffect(() => {
    if (members.length > 0) {
      setCurrentMembers(members);
    }
  }, [members]);

  const form = useForm<FormValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      name: group.name,
      description: group.description
    }
  });

  // Search for users to add to the group
  const [searchResults, setSearchResults] = useState<User[]>([]);
  
  // This would be replaced with an actual API call in a real implementation
  const handleSearchUsers = async () => {
    if (newPerson.trim().length < 2) return;
    
    try {
      // For now, we'll just add a dummy user since we don't have a user search API
      // In a real app, this would make an API call like:
      // const response = await apiRequest('GET', `/api/users/search?q=${newPerson}`);
      // const users = await response.json();
      // setSearchResults(users.filter(user => !currentMembers.some(m => m.id === user.id)));
      
      // For demo purposes, let's use a dummy user
      setSearchResults([{ 
        id: 999, 
        username: newPerson.trim(),
        password: '',
        createdAt: new Date(),
        email: null,
        displayName: null,
        avatarUrl: null
      }]);
    } catch (error) {
      console.error('Error searching for users:', error);
    }
  };
  
  const handleAddMember = async (user: User) => {
    try {
      // Add the user to the group through the API
      await apiRequest('POST', `/api/groups/${group.id}/members`, { userId: user.id });
      
      // Add to local state
      setCurrentMembers([...currentMembers, user]);
      
      // Clear search
      setNewPerson('');
      setSearchResults([]);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${group.id}/members`] });
      
      toast({
        title: 'Member added',
        description: `${user.username} has been added to the group.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add member to group.',
        variant: 'destructive'
      });
    }
  };
  
  const handleRemoveMember = async (user: User) => {
    try {
      // Remove the user from the group through the API
      await apiRequest('DELETE', `/api/groups/${group.id}/members/${user.id}`);
      
      // Remove from local state
      setCurrentMembers(currentMembers.filter(m => m.id !== user.id));
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${group.id}/members`] });
      
      toast({
        title: 'Member removed',
        description: `${user.username} has been removed from the group.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member from group.',
        variant: 'destructive'
      });
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchUsers();
    }
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      console.log('Editing group with data:', data);
      console.log('Group ID:', group.id);
      const response = await apiRequest('PUT', `/api/groups/${group.id}`, data);
      const updatedGroup = await response.json();
      console.log('Updated group response:', updatedGroup);

      // Invalidate the group query to refetch the updated data
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${group.id}`] });
      
      toast({
        title: 'Group updated',
        description: `Group "${data.name}" has been updated.`,
      });
      
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
                placeholder="Search for user to add"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={handleSearchUsers} 
                disabled={!newPerson.trim() || newPerson.trim().length < 2}
              >
                <Plus className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
            
            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mb-4 p-2 border rounded-md">
                <p className="text-xs font-medium mb-2">Search Results:</p>
                <div className="flex flex-wrap gap-2">
                  {searchResults.map((user) => (
                    <div 
                      key={user.id} 
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex items-center cursor-pointer hover:bg-blue-200"
                      onClick={() => handleAddMember(user)}
                    >
                      <span>{user.username}</span>
                      <span className="ml-2 text-blue-800">
                        <Plus className="h-3 w-3" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Current members */}
            <div className="mt-4">
              <p className="text-xs font-medium mb-2">Current Members:</p>
              {currentMembers.length === 0 ? (
                <p className="text-sm text-gray-500">No members yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentMembers.map((user) => (
                    <div 
                      key={user.id} 
                      className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center"
                    >
                      <span>{user.username}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveMember(user)}
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
              disabled={loading || !form.formState.isDirty}
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