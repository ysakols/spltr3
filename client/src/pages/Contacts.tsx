import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Contact, User } from "@shared/schema";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

// UI Components
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Avatar, 
  AvatarFallback 
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  PlusCircle, 
  Users, 
  Mail,
  Search,
  Send,
  User as UserIcon,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";



// Schema for adding a new contact
const addContactSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type AddContactFormValues = z.infer<typeof addContactSchema>;

function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current user from auth endpoint instead of localStorage
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  const userId = currentUser?.id;

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/users', userId, 'contacts'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!userId,
  });

  const { data: globalSummary } = useQuery<{ balances: Record<string, number> }>({
    queryKey: ['/api/users', userId, 'global-summary'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!userId,
  });

  // Initialize form for adding a new contact
  const form = useForm<AddContactFormValues>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      email: '',
    },
  });

  // Handle adding a new contact
  const handleAddContact = async (values: AddContactFormValues) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to add contacts.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Create a contact through the contacts API
      await apiRequest('POST', `/api/contacts`, { 
        email: values.email,
        userId,
      });
      
      toast({
        title: "Contact added",
        description: `${values.email} has been added to your contacts`,
      });
      
      // Reset the form and close the dialog
      form.reset();
      setShowAddContactDialog(false);
      
      // Refresh the contact list
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'contacts'] });
      
    } catch (error: any) {
      console.error('Error adding contact:', error);
      
      // Try to extract the error message from the response
      let errorMessage = "Failed to add contact. Please try again.";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  // Handle deleting a contact
  const handleDeleteContact = async (contactUserId: number) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to delete contacts.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Delete the contact
      await apiRequest('DELETE', `/api/contacts/${contactUserId}`);
      
      toast({
        title: "Contact deleted",
        description: "The contact has been removed from your list",
      });
      
      // Refresh the contact list
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'contacts'] });
      
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      
      // Try to extract the error message from the response
      let errorMessage = "Failed to delete contact. Please try again.";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Filter contacts based on search query
  const filteredContacts = contacts?.filter(contact => 
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get the initial letter for the avatar
  const getContactInitial = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  // Get balance with this contact if any
  const getContactBalance = (contactUserId: number): number | undefined => {
    if (!globalSummary?.balances) return undefined;
    return globalSummary.balances[contactUserId.toString()];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your contacts and past sharing relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="mt-2 sm:mt-0"
            onClick={() => setShowAddContactDialog(true)}
          >
            <UserIcon className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
          {/* Create Group button removed as requested */}
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Your Contacts</CardTitle>
              <CardDescription>
                People you've shared expenses with
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : contacts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No contacts yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                As you add people to your expense groups, they'll appear here
              </p>
              {/* Create Group button removed as requested */}
              <Button onClick={() => setShowAddContactDialog(true)}>
                <UserIcon className="mr-2 h-4 w-4" />
                Add a Contact
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[500px] rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts?.map((contact) => {
                    const balance = getContactBalance(contact.contactUserId);
                    const hasBalance = balance !== undefined;
                    
                    return (
                      <TableRow key={contact.contactUserId}>
                        <TableCell className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10">
                              {getContactInitial(contact.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{contact.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Last shared: {new Date(contact.lastInteractionAt).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {contact.frequency} {contact.frequency === 1 ? 'group' : 'groups'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {hasBalance ? (
                            <Badge 
                              variant={balance > 0 ? "default" : balance < 0 ? "destructive" : "outline"}
                              className={balance === 0 ? "bg-muted" : balance > 0 ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                            >
                              {balance > 0 
                                ? `Owes you $${Math.abs(balance).toFixed(2)}`
                                : balance < 0
                                  ? `You owe $${Math.abs(balance).toFixed(2)}`
                                  : "Settled up"}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">No balance</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {/* New Group button removed as requested */}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              asChild
                            >
                              <a 
                                href={`mailto:${contact.email}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={() => handleDeleteContact(contact.contactUserId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {/* Add Contact Dialog */}
      <Dialog open={showAddContactDialog} onOpenChange={setShowAddContactDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Enter contact details to add them to your contacts. They'll receive an email invitation.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddContact)} className="space-y-4">
              {/* First name field removed as requested */}
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
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddContactDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>Sending Invitation...</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Add & Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContactsPage;