import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Mail } from 'lucide-react';

import type { User as UserType } from '@shared/schema';

// Schema for adding new members
const inviteSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

// Type for our form values
type InviteFormValues = z.infer<typeof inviteSchema>;

interface AddMemberFormProps {
  groupId: number;
  onMemberAdded: () => void;
}

export function AddMemberForm({ groupId, onMemberAdded }: AddMemberFormProps) {
  const { toast } = useToast();

  // Get the current user
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ['/api/auth/me']
  });

  // Initialize the form with react-hook-form and zod validation
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
    },
  });

  // Send an email invitation
  const handleSendInvitation = async (values: InviteFormValues) => {
    try {
      await apiRequest('POST', `/api/groups/${groupId}/invitations`, { 
        email: values.email
      });
      
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${values.email}`,
      });
      
      // Reset the form
      form.reset();
      
      // Refresh the member list
      onMemberAdded();
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Add People</CardTitle>
        <CardDescription>
          Invite people to join this group by email
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSendInvitation)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="email@example.com"
                        type="email"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              <Mail className="mr-2 h-4 w-4" />
              {form.formState.isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default AddMemberForm;