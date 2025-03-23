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
      const response = await apiRequest('POST', '/api/groups', {
        name: groupName,
        people: filteredPeople
      });
      
      const data = await response.json();
      
      // Invalidate groups query to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      
      toast({
        title: 'Success',
        description: 'Group created successfully',
      });
      
      // Navigate to the new group
      navigate(`/groups/${data.id}`);
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
