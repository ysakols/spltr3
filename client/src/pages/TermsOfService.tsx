import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

function TermsOfService() {
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
          <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
          
          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            <div className="space-y-6">
              <section>
                <h2 className="text-lg font-semibold mb-2">Last Updated: {new Date().toLocaleDateString()}</h2>
                <p className="text-muted-foreground">
                  Please read these Terms of Service ("Terms") carefully before using the expense-tracking application ("spltr3") operated by the service provider ("we," "us," or "our").
                </p>
                <p className="text-muted-foreground mt-2">
                  By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Service.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">1. Usage Agreement</h2>
                <p className="mb-2">
                  Our Service allows you to track, manage, and split expenses with other users. By using our Service, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide accurate and complete information when creating your account</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Use the Service only for lawful purposes and in accordance with these Terms</li>
                  <li>Not engage in any activity that interferes with or disrupts the Service</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">2. User Accounts</h2>
                <p className="mb-2">
                  When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
                </p>
                <p>
                  You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">3. Intellectual Property</h2>
                <p className="mb-2">
                  The Service and its original content, features, and functionality are and will remain the exclusive property of the service provider. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of the service provider.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">4. User Content</h2>
                <p className="mb-2">
                  Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material ("Content"). You are responsible for the Content that you post on or through the Service, including its legality, reliability, and appropriateness.
                </p>
                <p className="mb-2">
                  By posting Content on or through the Service, you grant us the right to use, modify, publicly perform, publicly display, reproduce, and distribute such Content on and through the Service. You retain any and all of your rights to any Content you submit, post, or display on or through the Service and you are responsible for protecting those rights.
                </p>
                <p>
                  You represent and warrant that: (i) the Content is yours (you own it) or you have the right to use it and grant us the rights and license as provided in these Terms, and (ii) the posting of your Content on or through the Service does not violate the privacy rights, publicity rights, copyrights, contract rights or any other rights of any person.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">5. Termination</h2>
                <p className="mb-2">
                  We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                </p>
                <p>
                  Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service or contact us to request account deletion.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">6. Limitation Of Liability</h2>
                <p className="mb-2">
                  IN NO EVENT SHALL THE SERVICE PROVIDER, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES, BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE;</li>
                  <li>ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE;</li>
                  <li>ANY CONTENT OBTAINED FROM THE SERVICE; AND</li>
                  <li>UNAUTHORIZED ACCESS, USE OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT;</li>
                </ul>
                <p className="mt-2">
                  WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE) OR ANY OTHER LEGAL THEORY, WHETHER OR NOT WE HAVE BEEN INFORMED OF THE POSSIBILITY OF SUCH DAMAGE, AND EVEN IF A REMEDY SET FORTH HEREIN IS FOUND TO HAVE FAILED OF ITS ESSENTIAL PURPOSE.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">7. Disclaimer</h2>
                <p className="mb-2">
                  YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK. THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. THE SERVICE IS PROVIDED WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT OR COURSE OF PERFORMANCE.
                </p>
                <p>
                  THE SERVICE PROVIDER, ITS SUBSIDIARIES, AFFILIATES, AND ITS LICENSORS DO NOT WARRANT THAT: (A) THE SERVICE WILL FUNCTION UNINTERRUPTED, SECURE OR AVAILABLE AT ANY PARTICULAR TIME OR LOCATION; (B) ANY ERRORS OR DEFECTS WILL BE CORRECTED; (C) THE SERVICE IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS; OR (D) THE RESULTS OF USING THE SERVICE WILL MEET YOUR REQUIREMENTS.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">8. Data Accuracy</h2>
                <p className="mb-2">
                  The Service is designed to help you track and split expenses with others. While we strive to ensure the Service functions correctly, we do not guarantee the accuracy of any calculations, data, or information generated by the Service. You acknowledge that:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>The Service should not be relied upon for critical financial decisions</li>
                  <li>You are responsible for verifying any calculations or data before making financial decisions</li>
                  <li>We are not liable for any financial losses or disputes arising from your use of the Service</li>
                </ul>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">9. Dispute Resolution</h2>
                <p>
                  Any dispute arising out of or relating to these Terms shall be resolved exclusively through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall be conducted in [Your Jurisdiction], and the arbitrator's decision shall be final and binding. Each party shall bear its own costs in any arbitration proceeding.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">10. Indemnification</h2>
                <p>
                  You agree to defend, indemnify and hold harmless the service provider and its licensee and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees), resulting from or arising out of: (a) your use and access of the Service; (b) your violation of any term of these Terms; (c) your violation of any third-party right, including without limitation any copyright, property, or privacy right; or (d) any claim that your Content caused damage to a third party.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">11. Changes</h2>
                <p>
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">12. Governing Law</h2>
                <p>
                  These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2">13. Contact Us</h2>
                <p>
                  If you have any questions about these Terms, please contact us at:
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

export default TermsOfService;