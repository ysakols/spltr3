import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container py-6 flex items-center">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/login">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
        </Button>
      </div>
      
      <div className="container flex-1 py-6 max-w-3xl">
        <div className="bg-card rounded-lg shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
          
          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            <div className="space-y-6">
              <section>
                <h2 className="text-lg font-semibold mb-2">Last Updated: {new Date().toLocaleDateString()}</h2>
                <p className="text-muted-foreground">
                  This Privacy Policy describes how your personal information is collected, used, and shared when you use our expense-tracking application ("spltr3").
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">1. Information We Collect</h2>
                <p className="mb-2">
                  We collect information that you provide directly to us when using the application:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Account information (email address, name)</li>
                  <li>Group and expense information you create</li>
                  <li>Messages and communications within the platform</li>
                  <li>Information about your contacts that you choose to share</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">2. How We Use Your Information</h2>
                <p className="mb-2">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide, maintain, and improve our Services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send you technical notices, updates, and administrative messages</li>
                  <li>Respond to your comments, questions, and requests</li>
                  <li>Communicate with you about products and services</li>
                  <li>Monitor and analyze trends, usage, and activities in connection with our Services</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">3. No Sharing of Personal Information</h2>
                <p className="mb-2">
                  <strong>We do not sell, rent, or share your personal information with third parties for their marketing purposes.</strong> Your personal information remains private and is only used as described in this Privacy Policy.
                </p>
                <p>
                  Your information may be shared only in the following limited circumstances:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>With other members of groups you create or join (limited to information relevant to the group)</li>
                  <li>To comply with applicable law or legal process</li>
                  <li>To protect our rights, property, or safety</li>
                  <li>With your consent or at your direction</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">4. Data Security</h2>
                <p>
                  We implement reasonable security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">5. Your Rights</h2>
                <p className="mb-2">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Access the personal information we hold about you</li>
                  <li>Request correction of your personal information</li>
                  <li>Request deletion of your account and personal information</li>
                  <li>Object to processing of your personal information</li>
                  <li>Request restriction of processing your personal information</li>
                </ul>
                <p className="mt-2">
                  To exercise these rights, please contact us using the contact information provided below.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">6. Data Retention</h2>
                <p>
                  We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When determining how long to retain information, we consider the amount, nature, and sensitivity of the information, the potential risk of harm from unauthorized use or disclosure, and whether we can achieve our purposes through other means.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">7. Children's Privacy</h2>
                <p>
                  Our Services are not directed to children under the age of 13, and we do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will promptly take steps to delete such information.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">8. Changes to This Privacy Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time in response to changing legal, technical, or business developments. When we update our Privacy Policy, we will post the updated version and change the "Last Updated" date above. Your continued use of our Services after any changes to this Privacy Policy indicates your agreement with the terms of the revised Privacy Policy.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">9. Disclaimer of Liability</h2>
                <p>
                  While we take reasonable measures to protect your data, we expressly disclaim any representation or warranty, express or implied, regarding the security of your personal information. You acknowledge that no data transmission or storage system can be guaranteed to be 100% secure, and you agree that you are using this service at your own risk.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">10. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by applicable law, in no event shall the service provider, its affiliates, or their respective officers, directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from any data breach, unauthorized access, or other privacy-related incident.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">11. Contact Us</h2>
                <p>
                  If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
                </p>
                <p className="font-medium mt-2">
                  Email: support@spltr3.example.com
                </p>
              </section>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;