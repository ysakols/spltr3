import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold">
              s
            </div>
            <span className="text-xl">spltr3</span>
          </Link>
          <Button asChild size="sm">
            <Link href="/login">sign in</Link>
          </Button>
        </div>
      </header>
      <main className="container flex-1 py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          <div>
            <h1 className="text-3xl">terms of service</h1>
            <p className="mt-2 text-muted-foreground">last updated: april 12, 2025</p>
          </div>

          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-xl">1. introduction</h2>
              <p>
                welcome to spltr3 ("company", "we", "our", "us")! these terms of service ("terms", "terms of service")
                govern your use of our website and mobile application (together or individually, the "service") operated
                by spltr3.
              </p>
              <p>
                our privacy policy also governs your use of our service and explains how we collect, safeguard and
                disclose information that results from your use of our web pages. please read it here:{" "}
                <Link href="/privacy" className="text-green-600 hover:underline">
                  privacy policy
                </Link>
                .
              </p>
              <p>
                by accessing or using the service, you agree to be bound by these terms. if you disagree with any part
                of the terms, then you may not access the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">2. use license and restrictions</h2>
              <p>
                spltr3 grants you a limited, non-exclusive, non-transferable, and revocable license to access and use
                the service for personal, non-commercial purposes. this license is conditional on your compliance with
                these terms.
              </p>
              <p>you agree not to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>modify, copy, or create derivative works based on the service or its content</li>
                <li>
                  use the service for any illegal purpose or in violation of any local, state, national, or
                  international law
                </li>
                <li>attempt to gain unauthorized access to any portion of the service or any related systems</li>
                <li>use the service to transmit any viruses, worms, or other malicious code</li>
                <li>interfere with or disrupt the integrity or performance of the service</li>
                <li>collect or harvest any information from the service without authorization</li>
                <li>impersonate any person or entity or misrepresent your affiliation with a person or entity</li>
                <li>use the service in any manner that could disable, overburden, damage, or impair the service</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">3. user accounts</h2>
              <p>
                when you create an account with us, you must provide information that is accurate, complete, and current
                at all times. failure to do so constitutes a breach of the terms, which may result in immediate
                termination of your account on our service.
              </p>
              <p>
                you are responsible for safeguarding the password that you use to access the service and for any
                activities or actions under your password. you agree not to disclose your password to any third party.
                you must notify us immediately upon becoming aware of any breach of security or unauthorized use of your
                account.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">4. intellectual property</h2>
              <p>
                the service and its original content (excluding content provided by users), features, and functionality
                are and will remain the exclusive property of spltr3 and its licensors. the service is protected by
                copyright, trademark, and other laws of both the united states and foreign countries. our trademarks and
                trade dress may not be used in connection with any product or service without the prior written consent
                of spltr3.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">5. user-generated content</h2>
              <p>
                our service allows you to post, link, store, share and otherwise make available certain information,
                text, graphics, or other material ("content"). you are responsible for the content that you post on or
                through the service, including its legality, reliability, and appropriateness.
              </p>
              <p>
                by posting content on or through the service, you represent and warrant that: (i) the content is yours
                (you own it) or you have the right to use it and grant us the rights and license as provided in these
                terms, and (ii) the posting of your content on or through the service does not violate the privacy
                rights, publicity rights, copyrights, contract rights or any other rights of any person.
              </p>
              <p>we reserve the right to terminate the account of any user found to be infringing on a copyright.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">6. disclaimer of warranties</h2>
              <p>
                the service is provided "as is" and "as available" without warranties of any kind, either express or
                implied, including, but not limited to, implied warranties of merchantability, fitness for a particular
                purpose, non-infringement, or course of performance.
              </p>
              <p>
                spltr3, its subsidiaries, affiliates, and licensors do not warrant that: (a) the service will function
                uninterrupted, secure, or available at any particular time or location; (b) any errors or defects will
                be corrected; (c) the service is free of viruses or other harmful components; or (d) the results of
                using the service will meet your requirements.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">7. limitation of liability</h2>
              <p>
                to the maximum extent permitted by applicable law, in no event shall spltr3, its affiliates, directors,
                employees, agents, or licensors be liable for any indirect, punitive, incidental, special,
                consequential, or exemplary damages, including without limitation damages for loss of profits, goodwill,
                use, data, or other intangible losses, that result from the use of, or inability to use, the service.
              </p>
              <p>
                in no event will spltr3's total liability to you for all damages, losses, or causes of action exceed the
                amount you have paid to spltr3 in the last six (6) months, or, if greater, one hundred dollars ($100).
              </p>
              <p>
                some states do not allow the exclusion of certain warranties or the limitation or exclusion of liability
                for incidental or consequential damages. accordingly, some of the above limitations may not apply to
                you.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">8. financial information disclaimer</h2>
              <p>
                spltr3 is not a financial institution, payment processor, or money transmitter. the service is designed
                to help users track and manage shared expenses, but we do not handle, process, or store actual financial
                transactions. all payments and settlements between users occur outside of our platform.
              </p>
              <p>
                we are not responsible for any financial disputes between users, inaccuracies in expense recording, or
                issues with payments made outside of our platform. users are solely responsible for the accuracy of the
                financial information they input into the service and for resolving any disputes that may arise.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">9. indemnification</h2>
              <p>
                you agree to defend, indemnify, and hold harmless spltr3, its affiliates, licensors, and service
                providers, and its and their respective officers, directors, employees, contractors, agents, licensors,
                suppliers, successors, and assigns from and against any claims, liabilities, damages, judgments, awards,
                losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to
                your violation of these terms or your use of the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">10. termination</h2>
              <p>
                we may terminate or suspend your account immediately, without prior notice or liability, for any reason
                whatsoever, including without limitation if you breach the terms.
              </p>
              <p>
                upon termination, your right to use the service will immediately cease. if you wish to terminate your
                account, you may simply discontinue using the service or contact us to request account deletion.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">11. governing law</h2>
              <p>
                these terms shall be governed by and construed in accordance with the laws of the state of delaware,
                without regard to its conflict of law provisions.
              </p>
              <p>
                our failure to enforce any right or provision of these terms will not be considered a waiver of those
                rights. if any provision of these terms is held to be invalid or unenforceable by a court, the remaining
                provisions of these terms will remain in effect.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">12. dispute resolution</h2>
              <h3 className="text-lg font-medium">12.1 binding arbitration</h3>
              <p>
                any dispute arising from or relating to the subject matter of these terms shall be finally settled by
                binding arbitration in delaware, in accordance with the commercial arbitration rules of the american
                arbitration association.
              </p>
              <h3 className="text-lg font-medium">12.2 class action waiver</h3>
              <p>
                any proceedings to resolve or litigate any dispute in any forum will be conducted solely on an
                individual basis. neither you nor we will seek to have any dispute heard as a class action or in any
                other proceeding in which either party acts or proposes to act in a representative capacity.
              </p>
              <h3 className="text-lg font-medium">12.3 exceptions</h3>
              <p>
                nothing in this section will preclude either party from seeking injunctive relief in any court of
                competent jurisdiction.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">13. gdpr compliance</h2>
              <p>
                for users in the european union (eu), we comply with the general data protection regulation (gdpr). this
                means:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>we will only collect and process your data when we have a legal basis to do so</li>
                <li>we will be transparent about how we use your data</li>
                <li>we will provide you with access to your data and the ability to correct or delete it</li>
                <li>we will implement appropriate security measures to protect your data</li>
                <li>we will notify you promptly of any data breaches that might affect you</li>
              </ul>
              <p>
                for more information about how we handle data from eu users, please see our{" "}
                <Link href="/privacy" className="text-green-600 hover:underline">
                  privacy policy
                </Link>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">14. california users</h2>
              <p>
                if you are a california resident, you have specific rights regarding your personal information under the
                california consumer privacy act (ccpa) and the california privacy rights act (cpra). please see our{" "}
                <Link href="/privacy" className="text-green-600 hover:underline">
                  privacy policy
                </Link>{" "}
                for more information about these rights.
              </p>
              <p>
                in accordance with california civil code §1789.3, california users are entitled to the following
                consumer rights notice: the service is provided by spltr3. if you have a question or complaint regarding
                the service, please contact us at{" "}
                <a href="mailto:legal@spltr3.com" className="text-green-600 hover:underline">
                  legal@spltr3.com
                </a>
                . california residents may reach the complaint assistance unit of the division of consumer services of
                the california department of consumer affairs by mail at 1625 north market blvd., suite n 112,
                sacramento, ca 95834, or by telephone at (800) 952-5210.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">15. changes to terms</h2>
              <p>
                we reserve the right to modify or replace these terms at any time. if a revision is material, we will
                provide at least 30 days' notice prior to any new terms taking effect. what constitutes a material
                change will be determined at our sole discretion.
              </p>
              <p>
                by continuing to access or use our service after any revisions become effective, you agree to be bound
                by the revised terms. if you do not agree to the new terms, you are no longer authorized to use the
                service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">16. contact us</h2>
              <p>
                if you have any questions about these terms, please contact us at:
                <br />
                <a href="mailto:legal@spltr3.com" className="text-green-600 hover:underline">
                  legal@spltr3.com
                </a>
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">17. severability</h2>
              <p>
                if any provision of these terms is held to be unenforceable or invalid, such provision will be changed
                and interpreted to accomplish the objectives of such provision to the greatest extent possible under
                applicable law and the remaining provisions will continue in full force and effect.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">18. entire agreement</h2>
              <p>
                these terms constitute the entire agreement between us regarding our service, and supersede and replace
                any prior agreements we might have between us regarding the service.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
