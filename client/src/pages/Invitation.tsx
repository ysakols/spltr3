import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Schema for profile creation
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface InvitationResponse {
  groupId?: number;
  invitation?: {
    id?: number;
    inviteeEmail: string;
    groupId: number;
    requiresAuthentication: boolean;
    requiresConfirmation?: boolean;
    userEmail?: string;
    token?: string;
    isExpired?: boolean;
  };
}

function Invitation() {
  const [, setLocation] = useLocation();
  const [matches, params] = useRoute<{ token: string }>("/invitation/:token");
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationResponse["invitation"] | null>(null);
  const [acceptingInvitation, setAcceptingInvitation] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  
  // Initialize form for creating a profile
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  });
  
  useEffect(() => {
    // Fetch the invitation details
    const fetchInvitation = async () => {
      if (params?.token) {
        try {
          setLoading(true);
          const data = await apiRequest<InvitationResponse>('GET', `/api/invitations/${params.token}`);
          
          if (data && 'groupId' in data) {
            // The invitation was automatically accepted
            toast({
              title: "Success!",
              description: "You've been added to the group.",
              variant: "default",
            });
            // Redirect to the group page
            setLocation(`/groups/${data.groupId}`);
            return;
          }
          
          if (data && data.invitation) {
            setInvitation(data.invitation);
          }
        } catch (error) {
          setError("Invalid or expired invitation");
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchInvitation();
  }, [params?.token, setLocation, toast]);
  
  const handleLogin = () => {
    // Store token in session storage for later retrieval
    if (params?.token) {
      sessionStorage.setItem("pendingInvitationToken", params.token);
    }
    
    // Redirect to login page
    setLocation(`/login?redirect=/invitation/${params?.token}`);
  };
  
  // Handle showing the profile form
  const handleCreateProfile = () => {
    setShowProfileForm(true);
  };
  
  // Handle invitation acceptance for logged-in users
  const handleAcceptInvitation = async () => {
    if (!invitation || !invitation.id) {
      toast({
        title: "Error",
        description: "Invalid invitation data",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setAcceptingInvitation(true);
      
      // Update invitation status to accepted
      const result = await apiRequest('PUT', `/api/invitations/${invitation.id}`, {
        status: 'accepted'
      });
      
      toast({
        title: "Success!",
        description: "You've joined the group successfully.",
      });
      
      // Redirect to the group
      setLocation(`/groups/${invitation.groupId}`);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to accept the invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAcceptingInvitation(false);
    }
  };
  
  // Handle profile creation submission
  const onSubmitProfile = async (data: ProfileFormValues) => {
    if (!invitation || !params?.token) {
      toast({
        title: "Error",
        description: "Invalid invitation data",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setAcceptingInvitation(true);
      
      // Create a new user with this email and profile data
      const userData = {
        email: invitation.inviteeEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        displayName: `${data.firstName} ${data.lastName}`,
      };
      
      // Register the user
      const createdUser = await apiRequest('POST', '/api/users', userData);
      
      if (!createdUser) {
        throw new Error("Failed to create user account");
      }
      
      // Log in with the new credentials
      const loginResult = await apiRequest('POST', '/api/auth/login', {
        email: invitation.inviteeEmail,
        password: data.password
      });
      
      if (!loginResult || !loginResult.success) {
        throw new Error("Account created but login failed. Please try logging in manually.");
      }
      
      // After login, fetch the invitation details again to get the updated invitation ID
      const inviteResponse = await apiRequest<InvitationResponse>('GET', `/api/invitations/${params.token}`);
      
      if (!inviteResponse || !inviteResponse.invitation || !inviteResponse.invitation.id) {
        throw new Error("Failed to retrieve invitation details after login.");
      }
      
      // Explicitly accept the invitation
      await apiRequest('PUT', `/api/invitations/${inviteResponse.invitation.id}`, {
        status: 'accepted'
      });
      
      toast({
        title: "Success!",
        description: "Your account has been created and you've joined the group.",
      });
      
      // Redirect to the group
      setLocation(`/groups/${invitation.groupId}`);
    } catch (error: any) {
      console.error('Error creating profile:', error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to create your account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAcceptingInvitation(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (error || !invitation) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="container px-4 md:px-6 flex flex-col items-center">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">spltr3</h1>
              <p className="text-muted-foreground">Track and split expenses with friends</p>
            </div>
            
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Invalid Invitation</CardTitle>
                <CardDescription>
                  {error || "This invitation link is invalid or has expired."}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={() => setLocation("/")}>Go Home</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <div className="container px-4 md:px-6 flex flex-col items-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">spltr3</h1>
            <p className="text-muted-foreground">Track and split expenses with friends</p>
          </div>
          
          {showProfileForm ? (
            <Card className="w-full max-w-md">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">Create Your Profile</CardTitle>
                <CardDescription>
                  Complete your profile to join the group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitProfile)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-4 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowProfileForm(false)}
                        disabled={acceptingInvitation}
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit"
                        disabled={acceptingInvitation}
                      >
                        {acceptingInvitation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account & Join Group
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full max-w-md">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">You're invited!</CardTitle>
                <CardDescription>
                  You've been invited to join a group on spltr3
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">Invitation Details:</p>
                  <p>Email: {invitation.inviteeEmail}</p>
                  {invitation.requiresAuthentication && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">
                        You need to create an account or sign in to accept this invitation.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                {invitation.requiresAuthentication && (
                  <>
                    <Button 
                      onClick={handleCreateProfile}
                      disabled={acceptingInvitation}
                      className="w-full"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Create an Account
                    </Button>
                    <div className="relative w-full my-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or
                        </span>
                      </div>
                    </div>
                    <Button 
                      onClick={handleLogin}
                      disabled={acceptingInvitation}
                      variant="outline"
                      className="w-full"
                    >
                      {acceptingInvitation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign in with Email
                    </Button>
                  </>
                )}
                {!invitation.requiresAuthentication && invitation.requiresConfirmation && (
                  <>
                    <div className="mb-2 text-sm">
                      <p>You're logged in as <strong>{invitation.userEmail}</strong></p>
                      <p className="mt-2">Would you like to join this group?</p>
                    </div>
                    <div className="flex gap-2 w-full">
                      <Button 
                        onClick={handleAcceptInvitation}
                        disabled={acceptingInvitation}
                        className="flex-1"
                      >
                        {acceptingInvitation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Accept & Join Group
                      </Button>
                      <Button 
                        onClick={() => setLocation("/")}
                        variant="outline"
                        className="flex-1"
                      >
                        Decline
                      </Button>
                    </div>
                  </>
                )}
                {!invitation.requiresAuthentication && !invitation.requiresConfirmation && (
                  <Button 
                    onClick={() => setLocation(`/groups/${invitation.groupId}`)}
                    className="w-full"
                  >
                    View Group
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}
          
          <div className="text-center mt-8">
            <Button variant="link" onClick={() => setLocation("/")}>
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Invitation;