import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, User as UserIcon, Mail, X } from 'lucide-react';

import type { User as UserType, Contact } from '@shared/schema';

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
  const [activeTab, setActiveTab] = useState<string>("email");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get the current user for contacts
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ['/api/auth/me']
  });

  // Get the user's contact list
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<Contact[]>({
    queryKey: [`/api/users/${currentUser?.id}/contacts`],
    enabled: !!currentUser?.id, // Only fetch when we have the user ID
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

  // Add a contact directly as a member
  const handleAddContact = async (contact: Contact) => {
    try {
      await apiRequest('POST', `/api/groups/${groupId}/members`, { 
        userId: contact.contactUserId 
      });
      
      toast({
        title: "Member added",
        description: `${contact.email} has been added to the group.`,
      });
      
      // Refresh the member list
      onMemberAdded();
      
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: "Error",
        description: "Failed to add member to the group.",
        variant: "destructive",
      });
    }
  };

  // Get the initial letter for the avatar
  const getContactInitial = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Add People</CardTitle>
        <CardDescription>
          Invite people to join this group
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email Invite</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSendInvitation)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
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
          </TabsContent>
          
          <TabsContent value="contacts" className="mt-4">
            {isLoadingContacts ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Loading your contacts...</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No contacts found. Add people to your groups to build a contact list.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div 
                    key={contact.contactUserId} 
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted group"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10">
                          {getContactInitial(contact.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{contact.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {contact.frequency > 1 
                            ? `${contact.frequency} shared groups` 
                            : "1 shared group"}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => handleAddContact(contact)}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Add to group</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AddMemberForm;