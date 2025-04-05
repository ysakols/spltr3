import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQueryErrorHandler } from '@/lib/hooks';
import { getQueryFn } from '@/lib/queryClient';
import { Users, Calendar } from 'lucide-react';
import { numericToDisplayId } from '@/lib/id-utils';

import type { User } from '@shared/schema';
import type { ExtendedGroup } from '@/types';

function GroupList() {
  const handleError = useQueryErrorHandler();
  const [, setLocation] = useLocation();
  
  // Fetch the current user
  const { data: currentUser, isLoading: isLoadingUser, error: userError } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ 
      on401: "returnNull" 
    }),
    staleTime: 60000,
    retry: false
  });
  
  // Fetch groups for the logged-in user if authenticated, otherwise fetch all groups
  const { data: groups, isLoading: isLoadingGroups, error: groupsError } = useQuery<ExtendedGroup[]>({
    queryKey: ['/api/groups', currentUser?.id],
    queryFn: async ({ queryKey }) => {
      const userId = queryKey[1] as number | undefined;
      const baseUrl = queryKey[0] as string;
      const url = userId ? `${baseUrl}?userId=${userId}` : baseUrl;
      const res = await fetch(url, {
        credentials: "include",
      });
      if (res.status === 401 && !currentUser) {
        return []; // Return empty array when not authenticated
      }
      if (!res.ok) {
        throw new Error('Failed to fetch groups');
      }
      return res.json();
    },
    staleTime: 30000
  });
  
  // Fetch all users for displaying creator names
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    staleTime: 60000,
    enabled: !!currentUser
  });
  
  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (userError) {
      setLocation('/login');
    }
  }, [userError, setLocation]);
  
  // Handle error for groups query
  React.useEffect(() => {
    if (groupsError) {
      handleError(groupsError as Error);
    }
  }, [groupsError, handleError]);

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

      {isLoadingUser || isLoadingGroups || isLoadingUsers ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg shadow-md p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex flex-wrap items-center space-x-4">
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map(group => (
            <div 
              key={group.id} 
              className="bg-white shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer" 
              onClick={() => setLocation(`/groups/${numericToDisplayId(group.id)}`)}
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                    <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center text-sm text-gray-500">
                    {users && users.length > 0 && (
                      <div className="flex items-center mr-4">
                        <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <span className="mr-1">Created by:</span>
                        <span className="mr-1">
                          {(() => {
                            // First check if creatorInfo is available from the backend
                            if (group.creatorInfo) {
                              const creator = group.creatorInfo;
                              return creator.firstName && creator.lastName
                                ? `${creator.firstName} ${creator.lastName}`
                                : creator.displayName || 'User';
                            }
                            
                            // Fall back to users array if creatorInfo is not available
                            const creator = users.find(user => user.id === group.createdById);
                            if (!creator) return 'Unknown';
                            return creator.firstName && creator.lastName
                              ? `${creator.firstName} ${creator.lastName}`
                              : creator.displayName || 'User';
                          })()}
                        </span>
                        <span className="font-medium text-primary">(Admin)</span>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state bg-white p-8 shadow text-center">
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