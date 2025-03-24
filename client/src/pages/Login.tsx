import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FaGoogle } from "react-icons/fa";
import { useLocation } from "wouter";

function Login() {
  const [, setLocation] = useLocation();
  
  // Function to redirect to Google OAuth
  const handleGoogleLogin = () => {
    // Use relative URL to avoid CORS issues
    window.location.href = "auth/google";
  };
  
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
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription>
                Sign in to access your expense groups and split bills with friends
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
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

export default Login;