import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getPermissionsForRole, type UserRole, type Permissions } from '@/lib/permissions';

export type { UserRole, Permissions };

export const usePermissions = (): Permissions => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setRole(null);
          setIsLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        setRole(profileData ? ((profileData as any).role as UserRole) : null);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  return {
    ...getPermissionsForRole(role),
    isLoading,
  };
};
