import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "@/hooks/use-toast";

export function TestEmailModal() {
  const [loading, setLoading] = useState(false);
  const [emailData, setEmailData] = useState<null | {
    subject: string;
    html: string;
    text: string;
    previewUrl: string;
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleTestEmail = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test/invitation-email');
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setEmailData(data);
      
      toast({
        title: "Email preview generated",
        description: "The test email content has been retrieved successfully."
      });
    } catch (err) {
      setError((err as Error).message);
      
      toast({
        variant: "destructive",
        title: "Error generating email preview",
        description: (err as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setError(null)}>
          Test Invitation Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Test Invitation Email</DialogTitle>
          <DialogDescription>
            Preview how invitation emails will look when sent to users.
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
          {!emailData && !loading && !error && (
            <div className="text-center space-y-4">
              <p>Click the button below to generate a test invitation email preview.</p>
              <Button onClick={handleTestEmail} disabled={loading}>
                {loading ? "Generating..." : "Generate Preview"}
              </Button>
            </div>
          )}
          
          {loading && (
            <div className="text-center">
              <p>Loading preview...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center text-red-500 space-y-4">
              <p>Error: {error}</p>
              <Button onClick={handleTestEmail} disabled={loading}>
                Try Again
              </Button>
            </div>
          )}
          
          {emailData && (
            <div className="space-y-4">
              <div className="bg-muted p-2 rounded-md">
                <strong>Subject:</strong> {emailData.subject}
              </div>
              
              <Tabs defaultValue="html">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="html">HTML</TabsTrigger>
                  <TabsTrigger value="text">Plain Text</TabsTrigger>
                </TabsList>
                
                <TabsContent value="html" className="mt-2">
                  <div className="border rounded-md p-2 h-[300px] overflow-auto">
                    <iframe 
                      src={emailData.previewUrl} 
                      className="w-full h-full border-0"
                      title="Email HTML Preview" 
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="text" className="mt-2">
                  <div className="border rounded-md p-2 h-[300px] overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap">{emailData.text}</pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          
          {emailData && (
            <Button variant="default" onClick={handleTestEmail} disabled={loading}>
              Refresh Preview
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}