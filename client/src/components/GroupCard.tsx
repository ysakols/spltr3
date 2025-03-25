
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
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold">{name}</h3>
        {isActive && (
          <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
            Active
          </span>
        )}
      </div>
      
      <div className="space-y-2 text-gray-600">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4" />
          <span>
            Created by: {createdBy}
            {isAdmin && <span className="text-green-600 ml-1">(Admin)</span>}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          <span>Created: {createdAt}</span>
        </div>
      </div>
    </Card>
  );
}
