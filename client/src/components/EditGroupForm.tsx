import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';

import type { Group } from '@shared/schema';
import { insertGroupSchema } from '@shared/schema';

const editGroupSchema = insertGroupSchema.extend({
  people: z.array(z.string()).min(1, "At least one person is required"),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      name: group.name,
      people: [...group.people]
    }
  });

  const people = form.watch('people');

  const handleAddPerson = () => {
    if (newPerson.trim() && !people.includes(newPerson.trim())) {
      form.setValue('people', [...people, newPerson.trim()]);
      setNewPerson('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPerson();
    }
  };

  const handleRemovePerson = (index: number) => {
    const updatedPeople = [...people];
    updatedPeople.splice(index, 1);
    form.setValue('people', updatedPeople);
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await apiRequest('PUT', `/api/groups/${group.id}`, data);

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
            <Label className="block mb-2">People in Group</Label>
            
            <div className="flex space-x-2 mb-2">
              <Input
                placeholder="Add person (e.g., John)"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={handleAddPerson} 
                disabled={!newPerson.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            
            {form.formState.errors.people && (
              <p className="text-red-500 text-sm mb-2">{form.formState.errors.people.message}</p>
            )}
            
            <div className="flex flex-wrap gap-2">
              {people.map((person, index) => (
                <div 
                  key={`${person}-${index}`} 
                  className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center"
                >
                  <span>{person}</span>
                  <button 
                    type="button" 
                    onClick={() => handleRemovePerson(index)}
                    className="ml-2 text-gray-600 hover:text-gray-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
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