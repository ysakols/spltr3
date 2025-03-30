import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FaGoogle } from "react-icons/fa";
import { useLocation } from "wouter";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

function Login() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Parse redirect parameter from URL if it exists
  const getRedirectPath = () => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("redirect") || "/";
  };
  
  // Function to redirect to Google OAuth
  const handleGoogleLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Show a toast to inform the user about potential connection issues
    toast({
      title: "Google Sign-in Temporarily Unavailable",
      description: "Google sign-in is experiencing connectivity issues. Please use email login for now.",
      variant: "destructive",
      duration: 5000
    });
    
    // For debugging, let's log some information about the environment
    console.log("Current environment:", {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      host: window.location.host
    });
    
    // Disable Google login for now since it's not working
    return;
    
    // The code below is temporarily disabled
    /* 
    const redirectPath = getRedirectPath();
    const redirectParam = redirectPath !== "/" ? `?redirect=${encodeURIComponent(redirectPath)}` : "";
    fetch(`/auth/google${redirectParam}`, { method: 'GET' })
      .then(response => {
        if (response.redirected) {
          window.location.href = response.url;
        } else {
          window.location.href = `/auth/google${redirectParam}`;
        }
      })
      .catch(error => {
        console.error("Google login error:", error);
        toast({
          title: "Error",
          description: "Unable to connect to Google authentication. Please try again later or use email login.",
          variant: "destructive"
        });
      });
    */
  };

  // Function to handle local login
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      interface LoginResponse {
        success: boolean;
        message?: string;
        user?: any;
      }
      
      const response = await apiRequest<LoginResponse>('POST', "/api/auth/login", {
        email,
        password
      });
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Logged in successfully"
        });
        // Redirect to original destination if specified in URL
        const redirectPath = getRedirectPath();
        setLocation(redirectPath);
      } else {
        toast({
          title: "Error",
          description: response.message || "Invalid email or password",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <div className="container px-4 md:px-6 flex flex-col items-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">spltr3</h1>
            <p className="text-muted-foreground">Track and split expenses with friends</p>
          </div>
          
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription>
                Sign in to access your expense groups and split bills with friends
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {/* Local login form */}
              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
              
              <div className="relative my-4">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-card px-2 text-xs text-muted-foreground">OR</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2"
                onClick={handleGoogleLogin}
              >
                <FaGoogle className="h-4 w-4" />
                Sign in with Google
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col">
              <div className="text-sm text-muted-foreground mt-4">
                <p>By signing in, you agree to our <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.</p>
              </div>
            </CardFooter>
          </Card>
          
          {/* "Return to Home" button removed to prevent unauthorized access */}
        </div>
      </div>
    </div>
  );
}

export default Login;