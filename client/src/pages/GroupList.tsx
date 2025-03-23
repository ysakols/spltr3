import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQueryErrorHandler } from '@/lib/hooks';
import { Users, Calendar } from 'lucide-react';

import type { Group } from '@shared/schema';

function GroupList() {
  const handleError = useQueryErrorHandler();
  
  const { data: groups, isLoading, error } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    staleTime: 30000,
  });

  if (error) {
    handleError(error as Error);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Expense Groups</h2>
        <Button asChild>
          <Link href="/create">
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Group
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="col-span-1">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-2/3 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-6 w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(group => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <a className="col-span-1 bg-white rounded-lg shadow-md divide-y divide-gray-200 hover:shadow-lg transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <Users className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                    <span>{group.people.length} members</span>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                    <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </a>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600 mb-4">You don't have any expense groups yet.</p>
          <Button asChild>
            <Link href="/create">Create Your First Group</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default GroupList;
