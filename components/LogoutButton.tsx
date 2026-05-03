'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export function LogoutButton({ className = '' }: { className?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className={className || 'px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900'}
    >
      Logout
    </button>
  );
}
