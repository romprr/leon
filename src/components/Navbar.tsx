'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Brain, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/insights', icon: Brain, label: 'Insights' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#39a62d] h-[48px] rounded-[19px] w-[249px] flex items-center justify-between px-[8px] z-50 shadow-[0_0_0_3px_#fffff0,0_8px_30px_rgba(0,0,0,0.2)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center h-[32px] w-[32px] rounded-[12px] transition-colors relative",
              isActive ? "bg-[#fffff0] text-[#39a62d]" : "text-white"
            )}
          >
            <item.icon size={24} />
          </Link>
        );
      })}
    </div>
  );
}
