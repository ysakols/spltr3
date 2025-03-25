import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';

function CreateGroup() {
  const [groupName, setGroupName] = useState('');
  const [people, setPeople] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const addPerson = () => {
    setPeople([...people, '']);
  };

  const removePerson = (index: number) => {
    if (people.length <= 2) {
      return; // Don't remove if only 2 people left
    }
    const newPeople = [...people];
    newPeople.splice(index, 1);
    setPeople(newPeople);
  };

  const handlePersonChange = (index: number, value: string) => {
    const newPeople = [...people];
    newPeople[index] = value;
    setPeople(newPeople);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    
    const filteredPeople = people.filter(person => person.trim() !== '');
    if (filteredPeople.length < 2) {
      setError('At least 2 people are required');
      return;
    }
    
    try {
      setLoading(true);
      
      // First, we need to find or create users based on the names provided
      const userPromises = filteredPeople.map(async (personName) => {
        // Try to find existing user by username
        const userResponse = await fetch(`/api/users?username=${encodeURIComponent(personName)}`);
        
        if (userResponse.ok) {
          const existingUsers = await userResponse.json();
          if (existingUsers && existingUsers.length > 0) {
            return existingUsers[0].id; // Return existing user ID
          }
        }
        
        // If not found, create a new user
        const createResponse = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: personName,
            password: 'password123', // Default password
            displayName: personName
          }),
          credentials: 'include'
        });
        
        if (!createResponse.ok) {
          throw new Error(`Failed to create user ${personName}`);
        }
        
        const newUser = await createResponse.json();
        return newUser.id;
      });
      
      // Wait for all user creation/lookup to complete
      const userIds = await Promise.all(userPromises);
      
      // Create the group with the first user as the creator
      const creatorId = userIds[0];
      
      const response = await apiRequest('POST', '/api/groups', {
        name: groupName,
        description: null,
        createdById: creatorId
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error creating group:', errorData);
        throw new Error('Failed to create group');
      }
      
      const groupData = await response.json();
      
      // Add the other members to the group
      for (let i = 1; i < userIds.length; i++) {
        const addMemberResponse = await apiRequest('POST', `/api/groups/${groupData.id}/members`, {
          userId: userIds[i]
        });
        
        if (!addMemberResponse.ok) {
          console.warn(`Failed to add user ${userIds[i]} to group`, await addMemberResponse.text());
        }
      }
      
      // Invalidate groups query to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      toast({
        title: 'Success',
        description: 'Group created successfully',
      });
      
      // Navigate to the new group
      navigate(`/groups/${groupData.id}`);
    } catch (err) {
      setError((err as Error).message || 'Error creating group');
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create a New Expense Group</h2>
      
      <Card>
        <CardContent className="p-6">
          {error && (
            <div className="bg-red-50 text-red-600 rounded-md p-4 mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Trip to Hawaii, Apartment expenses"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label>People in this group</Label>
                <div className="mt-1 space-y-2">
                  {people.map((person, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={person}
                        onChange={(e) => handlePersonChange(index, e.target.value)}
                        placeholder={`Person ${index + 1}`}
                        className="flex-grow"
                      />
                      {people.length > 2 && (
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => removePerson(index)}
                          size="icon"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPerson}
                  className="mt-3"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Person
                </Button>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateGroup;
