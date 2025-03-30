import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Clock, Users, DollarSign, CreditCard } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

type ContactDetailResponse = {
  contact: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    lastInteractionAt: string | null;
    frequency: number;
  };
  sharedGroups: Array<{
    id: number;
    name: string;
    description: string;
    createdById: number;
    balance: number;
    expenses: Array<{
      id: number;
      amount: number;
      description: string;
      date: string;
      paidById: number;
    }>;
    totalExpenses: number;
  }>;
  globalBalance: number;
};

export default function ContactDetail() {
  const { toast } = useToast();
  const { contactId } = useParams<{ contactId: string }>();
  const userId = JSON.parse(localStorage.getItem("user") || "{}").id;

  const { data, isLoading, error } = useQuery<ContactDetailResponse>({
    queryKey: ["/api/users", userId, "contacts", contactId],
    enabled: !!userId && !!contactId,
  });

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-6">
          <Link to="/contacts">
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Contact Details</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive p-8">
              <p>Failed to load contact details. Please try again later.</p>
              <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to="/contacts">
          <Button variant="ghost" size="sm" className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Contact Details</h1>
      </div>

      {isLoading ? (
        <ContactDetailSkeleton />
      ) : data ? (
        <>
          {/* Contact Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-xl">
                    {data.contact.firstName.charAt(0)}
                    {data.contact.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{data.contact.displayName}</h2>
                  <p className="text-muted-foreground">{data.contact.email}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.contact.lastInteractionAt && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        Last interaction: {formatDate(new Date(data.contact.lastInteractionAt))}
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5 mr-1" />
                      {data.sharedGroups.length} shared {data.sharedGroups.length === 1 ? "group" : "groups"}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-lg font-semibold mb-1">Balance</div>
                  <Badge 
                    variant={data.globalBalance > 0 ? "default" : data.globalBalance < 0 ? "destructive" : "outline"}
                    className={`text-lg px-3 py-1 ${
                      data.globalBalance === 0 
                        ? "bg-muted" 
                        : data.globalBalance > 0 
                          ? "bg-green-100 text-green-800 hover:bg-green-200" 
                          : ""
                    }`}
                  >
                    {data.globalBalance > 0 
                      ? `Owes you $${Math.abs(data.globalBalance).toFixed(2)}`
                      : data.globalBalance < 0
                        ? `You owe $${Math.abs(data.globalBalance).toFixed(2)}`
                        : "Settled up"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shared Groups */}
          {data.sharedGroups.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground p-8">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No shared groups with this contact yet.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="expenses">Shared Expenses</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {data.sharedGroups.map(group => (
                    <Link key={group.id} href={`/groups/${group.id}`}>
                      <Card className="h-full cursor-pointer hover:bg-accent/10 transition-colors">
                        <CardHeader className="pb-2">
                          <CardTitle>{group.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground mb-3">
                            {group.description || "No description"}
                          </div>
                          
                          <div className="flex justify-between items-center mt-3">
                            <div className="flex items-center text-sm">
                              <DollarSign className="h-3.5 w-3.5 mr-1" />
                              <span>
                                {group.expenses.length} {group.expenses.length === 1 ? "expense" : "expenses"}
                              </span>
                            </div>
                            
                            <Badge 
                              variant={group.balance > 0 ? "default" : group.balance < 0 ? "destructive" : "outline"}
                              className={
                                group.balance === 0 
                                  ? "bg-muted" 
                                  : group.balance > 0 
                                    ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                    : ""
                              }
                            >
                              {group.balance > 0 
                                ? `Owes you $${Math.abs(group.balance).toFixed(2)}`
                                : group.balance < 0
                                  ? `You owe $${Math.abs(group.balance).toFixed(2)}`
                                  : "Settled up"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="expenses">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid by</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sharedGroups.flatMap(group => 
                        group.expenses.map(expense => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              <Link href={`/groups/${group.id}`} className="hover:underline">
                                {group.name}
                              </Link>
                            </TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell>{formatDate(new Date(expense.date))}</TableCell>
                            <TableCell>${expense.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              {expense.paidById === data.contact.id 
                                ? data.contact.displayName 
                                : expense.paidById === userId 
                                  ? "You" 
                                  : "Other"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {data.sharedGroups.flatMap(group => group.expenses).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p>No shared expenses found</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      ) : null}
    </div>
  );
}

function ContactDetailSkeleton() {
  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-36 mb-2" />
              <div className="flex gap-3 mt-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div>
              <Skeleton className="h-5 w-20 mb-1" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="h-full">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex justify-between items-center mt-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}