import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FaGoogle } from "react-icons/fa";
import { useLocation } from "wouter";

function Login() {
  const [, setLocation] = useLocation();
  
  // Function to redirect to Google OAuth
  const handleGoogleLogin = () => {
    window.location.href = "/auth/google";
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-muted/40">
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
    </div>
  );
}

export default Login;