import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
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
            <h1 className="text-3xl">privacy policy</h1>
            <p className="mt-2 text-muted-foreground">last updated: april 12, 2025</p>
          </div>

          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-xl">1. introduction</h2>
              <p>
                spltr3 ("we", "our", or "us") is committed to protecting your privacy. this privacy policy explains how
                we collect, use, disclose, and safeguard your information when you use our website and mobile
                application (collectively, the "service").
              </p>
              <p>
                please read this privacy policy carefully. by accessing or using the service, you acknowledge that you
                have read, understood, and agree to be bound by all the terms of this privacy policy. if you do not
                agree, please do not access or use our service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">2. information we collect</h2>
              <p>we may collect the following types of information:</p>
              <h3 className="text-lg font-medium">2.1 personal information</h3>
              <p>
                when you register for an account, we collect personal information such as your name and email address.
                you may also choose to provide additional information such as profile pictures or other identifiers.
              </p>
              <h3 className="text-lg font-medium">2.2 usage information</h3>
              <p>
                we collect information about how you use the service, including your interactions with features,
                content, and links. this may include the pages you visit, the time and date of your visits, and the time
                spent on those pages.
              </p>
              <h3 className="text-lg font-medium">2.3 device information</h3>
              <p>
                we collect information about the device you use to access the service, including the hardware model,
                operating system and version, unique device identifiers, and mobile network information.
              </p>
              <h3 className="text-lg font-medium">2.4 financial information</h3>
              <p>
                we collect information about expenses, payments, and balances that you input into the service. however,
                we do not collect or store actual payment method details such as credit card numbers or bank account
                information.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">3. how we use your information</h2>
              <p>we use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>provide, maintain, and improve the service</li>
                <li>process and complete transactions</li>
                <li>send you technical notices, updates, security alerts, and support messages</li>
                <li>respond to your comments, questions, and requests</li>
                <li>develop new products and services</li>
                <li>monitor and analyze trends, usage, and activities in connection with the service</li>
                <li>detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
                <li>
                  personalize the service by providing advertisements, content, or features that match user profiles or
                  interests
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">4. how we share your information</h2>
              <p>we may share your information in the following circumstances:</p>
              <h3 className="text-lg font-medium">4.1 with other users</h3>
              <p>
                when you create a group or add expenses, certain information (such as your name, profile picture, and
                the expense details you input) will be visible to other members of that group.
              </p>
              <h3 className="text-lg font-medium">4.2 service providers</h3>
              <p>
                we may share your information with third-party vendors, service providers, contractors, or agents who
                perform services for us or on our behalf and require access to such information to do that work.
              </p>
              <h3 className="text-lg font-medium">4.3 legal requirements</h3>
              <p>
                we may disclose your information if required to do so by law or in response to valid requests by public
                authorities (e.g., a court or government agency).
              </p>
              <h3 className="text-lg font-medium">4.4 business transfers</h3>
              <p>
                if we are involved in a merger, acquisition, or sale of all or a portion of our assets, your information
                may be transferred as part of that transaction.
              </p>
              <h3 className="text-lg font-medium">4.5 with your consent</h3>
              <p>we may share your information with third parties when you have given us your consent to do so.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">5. data security</h2>
              <p>
                we implement appropriate technical and organizational measures to protect the security of your personal
                information. however, please be aware that no method of transmission over the internet or method of
                electronic storage is 100% secure. while we strive to use commercially acceptable means to protect your
                personal information, we cannot guarantee its absolute security.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">6. your data protection rights</h2>
              <p>depending on your location, you may have the following rights:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>the right to access, update, or delete your information</li>
                <li>the right to rectification (to correct inaccurate information)</li>
                <li>the right to object to our processing of your personal information</li>
                <li>the right of restriction (to request that we restrict processing of your personal information)</li>
                <li>the right to data portability (to receive a copy of your personal information)</li>
                <li>the right to withdraw consent</li>
              </ul>
              <p>
                to exercise any of these rights, please contact us at{" "}
                <a href="mailto:privacy@spltr3.com" className="text-green-600 hover:underline">
                  privacy@spltr3.com
                </a>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">7. california privacy rights (ccpa and cpra)</h2>
              <p>
                if you are a california resident, you have specific rights regarding your personal information under the
                california consumer privacy act (ccpa) and the california privacy rights act (cpra).
              </p>
              <h3 className="text-lg font-medium">7.1 right to know</h3>
              <p>
                you have the right to request that we disclose certain information to you about our collection and use
                of your personal information over the past 12 months, including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>categories of personal information we collected about you</li>
                <li>categories of sources from which the personal information was collected</li>
                <li>our business or commercial purpose for collecting that personal information</li>
                <li>categories of third parties with whom we share that personal information</li>
                <li>specific pieces of personal information we collected about you</li>
              </ul>
              <h3 className="text-lg font-medium">7.2 right to delete</h3>
              <p>
                you have the right to request that we delete any of your personal information that we collected from you
                and retained, subject to certain exceptions.
              </p>
              <h3 className="text-lg font-medium">7.3 right to opt-out of sales and sharing</h3>
              <p>
                we do not sell personal information as defined by the ccpa/cpra. however, if this changes in the future,
                you will have the right to opt-out of the sale or sharing of your personal information.
              </p>
              <h3 className="text-lg font-medium">
                7.4 right to limit use and disclosure of sensitive personal information
              </h3>
              <p>
                you have the right to limit the use and disclosure of sensitive personal information collected about
                you.
              </p>
              <h3 className="text-lg font-medium">7.5 right to non-discrimination</h3>
              <p>we will not discriminate against you for exercising any of your ccpa/cpra rights.</p>
              <h3 className="text-lg font-medium">7.6 exercising your rights</h3>
              <p>
                to exercise your rights described above, please submit a verifiable consumer request to us by emailing{" "}
                <a href="mailto:privacy@spltr3.com" className="text-green-600 hover:underline">
                  privacy@spltr3.com
                </a>
                .
              </p>
              <p>
                we will respond to verifiable requests within 45 days of receipt. if we require more time, we will
                inform you of the reason and extension period in writing.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">8. gdpr compliance</h2>
              <p>
                if you are a resident of the european economic area (eea), you have certain data protection rights under
                the general data protection regulation (gdpr).
              </p>
              <h3 className="text-lg font-medium">8.1 legal basis for processing</h3>
              <p>we will only process your personal data when we have a legal basis to do so. legal bases include:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>your consent</li>
                <li>
                  performance of a contract (when processing is necessary for the performance of a contract with you)
                </li>
                <li>compliance with a legal obligation</li>
                <li>protection of vital interests</li>
                <li>public interest</li>
                <li>legitimate interests pursued by us or a third party</li>
              </ul>
              <h3 className="text-lg font-medium">8.2 data subject rights</h3>
              <p>under the gdpr, you have the following rights:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>right to access - you have the right to request copies of your personal data</li>
                <li>
                  right to rectification - you have the right to request that we correct any inaccurate information
                </li>
                <li>right to erasure - you have the right to request that we erase your personal data</li>
                <li>
                  right to restrict processing - you have the right to request restriction of processing of your data
                </li>
                <li>
                  right to data portability - you have the right to request the transfer of your data to another
                  organization
                </li>
                <li>right to object - you have the right to object to our processing of your personal data</li>
                <li>rights related to automated decision-making and profiling</li>
              </ul>
              <h3 className="text-lg font-medium">8.3 international transfers</h3>
              <p>
                your information may be transferred to — and maintained on — computers located outside of your state,
                province, country or other governmental jurisdiction where the data protection laws may differ from
                those in your jurisdiction.
              </p>
              <p>
                if you are located outside the united states and choose to provide information to us, please note that
                we transfer the data to the united states and process it there. your consent to this privacy policy
                followed by your submission of such information represents your agreement to that transfer.
              </p>
              <p>
                we will take all steps reasonably necessary to ensure that your data is treated securely and in
                accordance with this privacy policy and no transfer of your personal data will take place to an
                organization or a country unless there are adequate controls in place including the security of your
                data and other personal information.
              </p>
              <h3 className="text-lg font-medium">8.4 data protection officer</h3>
              <p>
                we have appointed a data protection officer (dpo) who is responsible for overseeing questions in
                relation to this privacy policy. if you have any questions about this privacy policy, including any
                requests to exercise your legal rights, please contact the dpo at{" "}
                <a href="mailto:dpo@spltr3.com" className="text-green-600 hover:underline">
                  dpo@spltr3.com
                </a>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">9. children's privacy</h2>
              <p>
                our service is not directed to children under the age of 16. we do not knowingly collect personal
                information from children under 16. if you are a parent or guardian and you are aware that your child
                has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">10. cookies and tracking technologies</h2>
              <p>
                we use cookies and similar tracking technologies to track the activity on our service and hold certain
                information. cookies are files with a small amount of data which may include an anonymous unique
                identifier.
              </p>
              <p>
                you can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. however,
                if you do not accept cookies, you may not be able to use some portions of our service.
              </p>
              <p>we use the following types of cookies:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>essential cookies: necessary for the basic function of the website</li>
                <li>functionality cookies: remember your preferences</li>
                <li>performance cookies: collect information about how you use the website</li>
                <li>
                  targeting cookies: record your visit to the website, the pages you have visited and the links you have
                  followed
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">11. data retention</h2>
              <p>
                we will retain your personal information only for as long as is necessary for the purposes set out in
                this privacy policy. we will retain and use your information to the extent necessary to comply with our
                legal obligations, resolve disputes, and enforce our policies.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">12. changes to this privacy policy</h2>
              <p>
                we may update our privacy policy from time to time. we will notify you of any changes by posting the new
                privacy policy on this page and updating the "last updated" date at the top of this privacy policy.
              </p>
              <p>
                you are advised to review this privacy policy periodically for any changes. changes to this privacy
                policy are effective when they are posted on this page.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl">13. contact us</h2>
              <p>
                if you have any questions about this privacy policy, please contact us at:
                <br />
                <a href="mailto:privacy@spltr3.com" className="text-green-600 hover:underline">
                  privacy@spltr3.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
