import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvitationResponse {
  groupId?: number;
  invitation?: {
    inviteeEmail: string;
    groupId: number;
    requiresAuthentication: boolean;
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
  
  useEffect(() => {
    // Fetch the invitation details
    const fetchInvitation = async () => {
      if (params?.token) {
        try {
          setLoading(true);
          const data: InvitationResponse = await apiRequest(`/api/invitations/${params.token}`);
          
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
    
    // Redirect to login (relative path to avoid CORS issues)
    window.location.href = "auth/google";
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
              <h1 className="text-3xl font-bold mb-2">ExpenseSplit</h1>
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
            <h1 className="text-3xl font-bold mb-2">ExpenseSplit</h1>
            <p className="text-muted-foreground">Track and split expenses with friends</p>
          </div>
          
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">You're invited!</CardTitle>
              <CardDescription>
                You've been invited to join a group on ExpenseSplit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">Invitation Details:</p>
                <p>Email: {invitation.inviteeEmail}</p>
                {invitation.requiresAuthentication && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      You need to sign in to accept this invitation.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {invitation.requiresAuthentication ? (
                <Button 
                  onClick={handleLogin}
                  disabled={acceptingInvitation}
                  className="w-full"
                >
                  {acceptingInvitation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in with Google
                </Button>
              ) : (
                <Button 
                  onClick={() => setLocation(`/groups/${invitation.groupId}`)}
                  className="w-full"
                >
                  View Group
                </Button>
              )}
            </CardFooter>
          </Card>
          
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