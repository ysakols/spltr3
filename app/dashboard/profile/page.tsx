import { ProfileForm } from "@/components/dashboard/profile-form"

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>
      <ProfileForm />
    </div>
  )
}
