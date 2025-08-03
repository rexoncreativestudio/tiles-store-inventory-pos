// src/components/ui/breadcrumb.tsx
"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Reusable Breadcrumb component
export default function Breadcrumb() {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(segment => segment !== '');

  // Function to humanize segment names
  const humanizeSegment = (segment: string): string => {
    // Handle specific route names
    switch (segment) {
      case 'dashboard': return 'Dashboard';
      case 'overview': return 'Overview';
      case 'products': return 'Products';
      case 'purchases': return 'Purchases';
      case 'sales': return 'Sales';
      case 'accounting': return 'Accounting';
      case 'expenses': return 'Expenses';
      case 'settings': return 'Settings';
      case 'users': return 'User Management';
      case 'branches': return 'Branch Management';
      case 'warehouses': return 'Warehouse Management';
      case 'pos': return 'POS';
      case 'receipt': return 'Receipt';
      case 'external': return 'External';
      // Add more cases for specific routes or dynamic segment prefixes like 'edit' etc.
      default:
        // Try to humanize common patterns for dynamic segments or general words
        return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }
  };

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground p-4">
      {pathSegments.length > 0 ? (
        pathSegments.map((segment, index) => {
          const href = '/' + pathSegments.slice(0, index + 1).join('/');
          const isLast = index === pathSegments.length - 1;
          const displaySegment = humanizeSegment(segment);

          return (
            <React.Fragment key={href}>
              <Link href={href} className={cn("hover:text-primary", isLast && "text-foreground font-medium cursor-default")}>
                {displaySegment}
              </Link>
              {!isLast && <ChevronRight className="h-3 w-3 text-gray-400" />}
            </React.Fragment>
          );
        })
      ) : (
        <span className="text-foreground font-medium">Dashboard</span> // Default for root dashboard
      )}
    </nav>
  );
}