
import { CalendarIcon, UserIcon } from "lucide-react";
import { Card } from "./ui/card";

interface GroupCardProps {
  name: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  isAdmin?: boolean;
}

export function GroupCard({ name, isActive, createdBy, createdAt, isAdmin }: GroupCardProps) {
  return (
    <Card className="relative p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold truncate">{name}</h3>
        {isActive && (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full whitespace-nowrap ml-2">
            Active
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 shrink-0" />
          <span className="text-sm text-gray-600 truncate">
            {createdBy}
            {isAdmin && <span className="text-green-600 ml-1">(Admin)</span>}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 shrink-0" />
          <span className="text-sm text-gray-600">{createdAt}</span>
        </div>
      </div>
    </Card>
  );
}
