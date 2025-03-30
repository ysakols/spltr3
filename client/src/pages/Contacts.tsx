import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Contact, User } from "@shared/schema";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

// Extended Contact interface with additional fields from API
interface ExtendedContact extends Contact {
  // User-related fields
  isUser?: boolean;
  firstName?: string;
  lastName?: string;
  
  // Group-related fields
  groupIds?: number[];
  
  // Invitation-related fields
  invitationId?: number;
  token?: string;
  status?: string;
  
  // Balance calculation
  balanceValue?: number;
}

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
  Trash2,
  ArrowUp
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

  const { data: contacts, isLoading } = useQuery<ExtendedContact[]>({
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
    
    // Only attempt deletion for contacts with a valid contactUserId
    if (!contactUserId || contactUserId <= 0) {
      toast({
        title: "Cannot delete invitation",
        description: "This contact hasn't registered yet, so it can't be deleted.",
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

  // Filter contacts based on search query and relevance
  const filteredContacts = contacts?.filter(contact => {
    // First apply search query filter
    const matchesSearch = contact.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    // We want to show only:
    // 1. Contacts the user directly added
    // 2. Contacts from groups the user is in 
    // 3. Pending invitations the user sent
    
    // For debugging
    console.log('Contact being filtered:', contact);
    
    // Cast to ExtendedContact to access the additional properties
    const extendedContact = contact as ExtendedContact;
    
    // IMPORTANT FIX: Return true for ALL contacts that come from the API
    // The server already filters appropriately, so we just need to display what it sends
    return true;
    
    /* Previous overly-restrictive filtering logic
    // Important: Always display contacts with invitationId - these are your sent invitations
    if (extendedContact.invitationId) {
      console.log('Including invitation contact:', extendedContact.email, extendedContact.invitationId);
      return true;
    }
    
    // If it has a token, it's also an invitation
    if (extendedContact.token) {
      console.log('Including token contact:', extendedContact.email);
      return true;
    }
    
    // Show all directly added contacts (regular contacts)
    if (contact.contactUserId > 0) {
      console.log('Including regular contact:', extendedContact.email);
      return true;
    }
    
    // For group members, verify they have groups in common with you
    const isGroupMember = !!extendedContact.isUser && !!extendedContact.groupIds && extendedContact.groupIds.length > 0;
    
    if (isGroupMember) {
      console.log('Including group member:', extendedContact.email, extendedContact.groupIds);
      return true;
    }
    
    console.log('Excluding contact:', extendedContact.email);
    return false;
    */
  });

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>('email');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Handle sorting click
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with ascending direction
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Navigation hook - must be at component level, not inside map/loops
  const [, navigate] = useLocation();
  
  // Get the initial letter for the avatar
  const getContactInitial = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  // Get balance with this contact if any
  const getContactBalance = (contactUserId: number): number | undefined => {
    if (!globalSummary?.balances) return undefined;
    return globalSummary.balances[contactUserId.toString()];
  };
  
  // Format date or return a placeholder for invalid dates
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) {
      return "No date available";
    }
    
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "No date available";
    }
    return date.toLocaleDateString();
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
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center">
                        Contact
                        {sortColumn === 'email' && (
                          <ArrowUp className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>

                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('balance')}
                    >
                      <div className="flex items-center">
                        Balance
                        {sortColumn === 'balance' && (
                          <ArrowUp className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts
                    ?.map((contact) => {
                      const balance = getContactBalance(contact.contactUserId) || 0;
                      const hasBalance = balance !== undefined;
                      
                      return {
                        ...contact,
                        balanceValue: balance
                      };
                    })
                    // Sort the contacts based on current column and direction
                    .sort((a, b) => {
                      if (sortColumn === 'email') {
                        return sortDirection === 'asc' 
                          ? a.email.localeCompare(b.email)
                          : b.email.localeCompare(a.email);
                      } else if (sortColumn === 'balance') {
                        return sortDirection === 'asc'
                          ? a.balanceValue - b.balanceValue
                          : b.balanceValue - a.balanceValue;
                      }
                      return 0;
                    })
                    .map((contact) => {
                      const balance = contact.balanceValue;
                      const hasBalance = balance !== undefined;
                      
                      // Create a unique key for each contact, using email if contactUserId is not valid
                      const uniqueKey = contact.contactUserId && contact.contactUserId > 0 
                                      ? `contact-${contact.contactUserId}` 
                                      : `contact-email-${contact.email}`;
                      
                      // Cast to ExtendedContact to access the additional properties
                      const extContact = contact as ExtendedContact;
                      
                      // Determine if this is a pending invitation (has token or invitationId)
                      const isPendingInvitation = !extContact.isUser || !!extContact.invitationId || !!extContact.token;
                      
                      // Determine if this contact can be deleted
                      // We allow deletion of:
                      // 1. Directly added contacts (with a valid contactUserId)
                      // 2. Pending invitations that the current user sent (we'll need to implement this on server)
                      const canDelete = contact.contactUserId > 0;
                      
                      // Handle click on a contact row
                      const handleContactClick = () => {
                        if (!isPendingInvitation && contact.contactUserId > 0) {
                          navigate(`/contacts/${contact.contactUserId}`);
                        }
                      };
                      
                      return (
                        <TableRow 
                          key={uniqueKey}
                          className={!isPendingInvitation && contact.contactUserId > 0 ? "cursor-pointer hover:bg-accent/50" : ""}
                          onClick={handleContactClick}>
                          <TableCell className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className={isPendingInvitation ? "bg-amber-100" : "bg-primary/10"}>
                                {getContactInitial(contact.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {extContact.firstName && extContact.lastName 
                                    ? `${extContact.firstName} ${extContact.lastName}`
                                    : contact.email}
                                </p>
                                {isPendingInvitation && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                    Invited
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {isPendingInvitation 
                                  ? `Invited on: ${formatDate(contact.lastInteractionAt)}`
                                  : `Last interaction: ${formatDate(contact.lastInteractionAt)}`}
                              </p>
                              {extContact.firstName && extContact.lastName && (
                                <p className="text-xs text-muted-foreground">{contact.email}</p>
                              )}
                            </div>
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
                              {!isPendingInvitation && contact.contactUserId > 0 && (
                                <Button 
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary/80 hover:text-primary hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/contacts/${contact.contactUserId}`);
                                  }}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {canDelete ? (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteContact(contact.contactUserId);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : isPendingInvitation ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-xs text-muted-foreground"
                                  disabled
                                >
                                  Pending
                                </Button>
                              ) : null}
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