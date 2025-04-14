import { GroupDetail } from "@/components/dashboard/group-detail"

export default function GroupDetailPage({ params }: { params: { id: string } }) {
  return <GroupDetail id={params.id} />
}
