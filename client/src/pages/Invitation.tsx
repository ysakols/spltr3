import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function Invitation() {
  const [, setLocation] = useLocation();
  const [matches, params] = useRoute("/invitation/:token");
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [acceptingInvitation, setAcceptingInvitation] = useState(false);
  
  useEffect(() => {
    // Fetch the invitation details
    const fetchInvitation = async () => {
      if (params?.token) {
        try {
          setLoading(true);
          const response = await apiRequest(`/api/invitations/${params.token}`, {
            method: "GET"
          });
          
          if (response.groupId) {
            // The invitation was automatically accepted
            toast({
              title: "Success!",
              description: "You've been added to the group.",
              variant: "default",
            });
            // Redirect to the group page
            setLocation(`/groups/${response.groupId}`);
            return;
          }
          
          setInvitation(response.invitation);
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
    
    // Redirect to login
    window.location.href = "/auth/google";
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (error || !invitation) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-muted/40">
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
    );
  }
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/40">
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
              Sign in to accept
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
    </div>
  );
}

export default Invitation;