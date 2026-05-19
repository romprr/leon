'use client';

import { useStore } from '@/lib/store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function SetupGuard({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user.isSetupComplete && pathname !== '/setup') {
      router.push('/setup');
    }
    if (user.isSetupComplete && pathname === '/setup') {
      router.push('/');
    }
  }, [user.isSetupComplete, pathname, router]);

  // If on setup page, just render the setup content (which will be the children of RootLayout)
  if (!user.isSetupComplete && pathname !== '/setup') {
    return null; // Prevent flicker while redirecting
  }

  return <>{children}</>;
}
