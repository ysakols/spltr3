import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation, Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { SiGoogle } from "react-icons/si";
import { RegisterForm } from "@/components/RegisterForm";

function Login() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  
  // Check for error message in URL (e.g., from failed Google auth)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get("error");
    
    if (error) {
      toast({
        title: "Authentication Error",
        description: decodeURIComponent(error),
        variant: "destructive"
      });
      
      // Remove the error from the URL to prevent showing it again on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [toast]);
  
  // Parse redirect parameter from URL if it exists
  const getRedirectPath = () => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("redirect") || "/";
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
        
        // Force a reload of the app to ensure auth state is updated
        if (redirectPath === '/') {
          window.location.href = '/';
        } else {
          window.location.href = redirectPath;
        }
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
              {/* Login form */}
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
              
              {!showRegistration ? (
                <>
                  <div className="flex items-center justify-center mt-2">
                    <span className="text-sm text-muted-foreground">
                      Don't have an account yet? Create one below:
                    </span>
                  </div>
                  
                  <div className="mt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowRegistration(true)}
                    >
                      Create Account
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="pt-4 pb-2">
                    <h3 className="text-lg font-medium">Create New Account</h3>
                    <p className="text-sm text-muted-foreground">
                      Please provide your information below to create a new account
                    </p>
                  </div>
                  
                  <RegisterForm 
                    onSuccess={() => {
                      // Redirect to home page on successful registration
                      window.location.href = "/";
                    }}
                    onCancel={() => setShowRegistration(false)}
                  />
                </>
              )}
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              
              <div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => {
                    // Get the redirect parameter
                    const redirectPath = getRedirectPath();
                    // Redirect to Google OAuth endpoint with the same redirect parameter
                    console.log('Redirecting to Google auth with redirect path:', redirectPath);
                    window.location.href = `/auth/google?redirect=${encodeURIComponent(redirectPath)}`;
                  }}
                >
                  <SiGoogle className="h-4 w-4" />
                  <span>Sign in with Google</span>
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col">
              <div className="text-sm text-muted-foreground mt-4">
                <p>By signing in, you agree to our <Link href="/terms-of-service" className="underline hover:text-primary">Terms of Service</Link> and <Link href="/privacy-policy" className="underline hover:text-primary">Privacy Policy</Link>.</p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Login;