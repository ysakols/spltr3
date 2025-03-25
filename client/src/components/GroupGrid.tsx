
import { Group } from "../types";
import { GroupCard } from "./GroupCard";

interface GroupGridProps {
  groups: Group[];
}

export function GroupGrid({ groups }: GroupGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          name={group.name}
          isActive={group.status === "active"}
          createdBy={group.createdBy.name}
          createdAt={new Date(group.createdAt).toLocaleDateString()}
          isAdmin={group.createdBy.isAdmin}
        />
      ))}
    </div>
  );
}
