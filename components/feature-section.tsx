import { Users, Receipt, CreditCard, BarChart4, UserPlus, Shield } from "lucide-react"

export function FeatureSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32" id="features">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-green-100 px-3 py-1 text-sm dark:bg-green-800/30">Features</div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
              Everything you need to manage shared expenses
            </h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Spltr3 provides a comprehensive set of tools to make expense sharing simple, transparent, and stress-free.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 pt-12">
          <div className="flex flex-col items-start space-y-4 p-6 border rounded-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-800/30">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Group Management</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Create and manage expense groups for roommates, trips, events, and more.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start space-y-4 p-6 border rounded-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-800/30">
              <Receipt className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Expense Tracking</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Record shared expenses with detailed information and flexible splitting options.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start space-y-4 p-6 border rounded-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-800/30">
              <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Debt Settlement</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Easily record and track payments between group members to settle debts.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start space-y-4 p-6 border rounded-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-800/30">
              <BarChart4 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Financial Analysis</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Analyze spending patterns with filtering and sorting options for transaction history.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start space-y-4 p-6 border rounded-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-800/30">
              <UserPlus className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Member Management</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Invite friends, manage group membership, and handle invitations with ease.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start space-y-4 p-6 border rounded-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-800/30">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Security & Reliability</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Secure account management and advanced features like duplicate prevention.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
