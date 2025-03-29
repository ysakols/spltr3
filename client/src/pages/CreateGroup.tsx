import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Mail } from 'lucide-react';

// Define our member type to include emails
interface GroupMember {
  email: string;
}

function CreateGroup() {
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([
    { email: '' },
    { email: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const addPerson = () => {
    setMembers([...members, { email: '' }]);
  };

  const removePerson = (index: number) => {
    if (members.length <= 2) {
      return; // Don't remove if only 2 people left
    }
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const handleEmailChange = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index].email = value;
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    
    // Validate all members have email addresses
    const validMembers = members.filter(member => member.email.trim() !== '');
    if (validMembers.length < 2) {
      setError('At least 2 people with valid email addresses are required');
      return;
    }

    // Check if all emails are valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = validMembers.filter(member => !emailRegex.test(member.email));
    if (invalidEmails.length > 0) {
      setError('Please enter valid email addresses for all members');
      return;
    }
    
    try {
      setLoading(true);
      
      // Step 1: Check if user is logged in
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include' // Important to include credentials
      });
      
      // If not authenticated, redirect to login page
      if (!authResponse.ok) {
        toast({
          title: 'Authentication Required',
          description: 'Please login to create a group',
          variant: 'destructive',
        });
        
        navigate('/login?redirect=/create');
        return;
      }
      
      const currentUser = await authResponse.json();
      
      // Create the group with current user as creator first
      const response = await fetch('/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: groupName,
          description: null,
          createdById: currentUser.id,
          // Don't add any initial members - creator is added automatically by the server
          initialMembers: []
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create group');
      }
      
      const createdGroup = await response.json();
      const groupId = createdGroup.id;
      
      // Now send email invitations to each member (AFTER the group is created)
      const invitationPromises = validMembers.map(async (member) => {
        try {
          // Skip adding the current user by email
          if (member.email === currentUser.email) {
            return null;
          }
          
          // Check if user already exists with this email
          const userByEmailResponse = await fetch(`/api/users?email=${encodeURIComponent(member.email)}`);
          if (userByEmailResponse.ok) {
            const existingUsers = await userByEmailResponse.json();
            if (existingUsers && existingUsers.length > 0) {
              // User exists, add them to the group directly
              return fetch(`/api/groups/${groupId}/members`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: existingUsers[0].id
                })
              });
            }
          }
          
          // Send invitation via the API (with the correct group ID)
          return fetch(`/api/groups/${groupId}/invitations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: member.email,
              userId: currentUser.id
            })
          });
        } catch (error) {
          console.error('Error inviting member:', error);
          return null;
        }
      });
      
      // Wait for all invitations to be sent
      await Promise.all(invitationPromises);
      
      // Invalidate groups query to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      toast({
        title: 'Success',
        description: `Group "${groupName}" created successfully. Email invitations have been sent to new members.`,
      });
      
      // Navigate to the new group
      navigate(`/groups/${groupId}`);
    } catch (err) {
      console.error('Error creating group:', err);
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
                <div className="mt-1 space-y-4">
                  {members.map((member, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-grow space-y-2">
                          <div className="relative">
                            <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={member.email}
                              onChange={(e) => handleEmailChange(index, e.target.value)}
                              placeholder="email@example.com"
                              type="email"
                              className="pl-9"
                              required
                            />
                          </div>
                        </div>
                        {members.length > 2 && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => removePerson(index)}
                            size="icon"
                            className="self-start"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPerson}
                  className="mt-4"
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
