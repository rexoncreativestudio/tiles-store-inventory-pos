// src/components/main-nav-sidebar.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Home,
  ShoppingCart,
  Users2,
  Package2,
  Package,
  Truck,
  BarChart3,
  Banknote,
  Settings,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  ClipboardList, // NEW: Icon for Stock Manager
  Boxes, // NEW: Icon for Stock Controller
} from 'lucide-react'; // CORRECTED: Added new icons
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Tooltip components are used

const menuItems = [
  { href: "/dashboard/overview", icon: Home, label: "Overview", alt: "Overview" },
  { href: "/dashboard/sales", icon: ShoppingCart, label: "Sales", alt: "Sales" },
  { href: "/dashboard/stock", icon: BarChart3, label: "Stock", alt: "Stock" },
  { href: "/dashboard/products", icon: Package, label: "Products", alt: "Products" },
  { href: "/dashboard/purchases", icon: Truck, label: "Purchases", alt: "Purchases" },
  { href: "/dashboard/expenses", icon: ReceiptText, label: "Expenses", alt: "Expenses" },
  { href: "/dashboard/accounting", icon: Banknote, label: "Accounting", alt: "Accounting" },
];

const stockManagementItems = [ // NEW: Group for Stock Management
  { href: "/dashboard/stock-controller", icon: Boxes, label: "Stock Controller", alt: "Stock Controller" },
  { href: "/dashboard/stock-manager", icon: ClipboardList, label: "Stock Manager", alt: "Stock Manager" },
];

const settingsItems = [
  { href: "/dashboard/settings", icon: Settings, label: "System Settings", alt: "System Settings" },
  { href: "/dashboard/users", icon: Users2, label: "Users", alt: "User Management" },
  { href: "/dashboard/branches", icon: Home, label: "Branches", alt: "Branch Management" },
  { href: "/dashboard/warehouses", icon: Package2, label: "Warehouses", alt: "Warehouse Management" },
];

export default function MainNavSidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (mobile) setIsCollapsed(false);
  }, [mobile]);

  useEffect(() => {
    if (!mobile) {
      document.documentElement.style.setProperty("--sidebar-width", isCollapsed ? "72px" : "288px");
    }
  }, [isCollapsed, mobile]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 border-r transition-all duration-300 ease-in-out shadow-md bg-white",
        isCollapsed && !mobile ? "w-18" : "w-72",
        mobile ? "h-full" : "md:flex flex-col"
      )}
      style={{
        borderTopRightRadius: '0px',
        borderBottomRightRadius: mobile ? '0px' : '1.5rem',
        borderTopLeftRadius: '0px',
        overflow: 'hidden',
        width: mobile ? '100%' : isCollapsed ? '72px' : '288px'
      }}
    >
      {/* Top bar with collapse button (desktop only) */}
      <div className="flex items-center justify-between h-20 px-4 border-b bg-white">
        <Link href="/dashboard/overview" className={cn("flex items-center gap-2 font-semibold text-xl", (isCollapsed || mobile) ? "hidden" : "flex")}>
          <Package2 className="h-8 w-8 text-primary" />
          <span className="tracking-tight">Tiles Store POS</span>
        </Link>
        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full border shadow hover:bg-primary/10"
            onClick={() => setIsCollapsed(v => !v)}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
          </Button>
        )}
        {mobile && onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full border shadow"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
      </div>
      {/* Menu */}
      <div className="flex-1 py-6 overflow-y-auto">
        <nav className={cn("grid gap-2 px-2 text-base font-medium")}>
          <TooltipProvider> {/* TooltipProvider is required to wrap Tooltip usage */}
            {menuItems.map((item) => (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-5 rounded-xl px-3 py-4 transition",
                      "hover:bg-primary/10 hover:shadow",
                      "text-muted-foreground hover:text-primary font-semibold",
                      isCollapsed ? "justify-center" : "",
                      "duration-200 relative"
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className={cn(isCollapsed ? "sr-only" : "inline")}>{item.label}</span>
                    {isCollapsed && (
                      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.alt}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.alt}</TooltipContent>
              </Tooltip>
            ))}

            {/* NEW: Stock Management Group */}
            <div className={cn("mt-10 mb-3 px-3 text-xs font-bold uppercase text-gray-400 tracking-wide", isCollapsed ? "text-center" : "")}>
              <span className={cn(isCollapsed ? "sr-only" : "inline")}>Stock Management</span>
            </div>
            {stockManagementItems.map((item) => (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-5 rounded-xl px-3 py-4 transition",
                      "hover:bg-primary/10 hover:shadow",
                      "text-muted-foreground hover:text-primary font-semibold",
                      isCollapsed ? "justify-center" : "",
                      "duration-200 relative"
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className={cn(isCollapsed ? "sr-only" : "inline")}>{item.label}</span>
                    {isCollapsed && (
                      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.alt}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.alt}</TooltipContent>
              </Tooltip>
            ))}

            {/* Settings Group */}
            <div className={cn("mt-10 mb-3 px-3 text-xs font-bold uppercase text-gray-400 tracking-wide", isCollapsed ? "text-center" : "")}>
              <span className={cn(isCollapsed ? "sr-only" : "inline")}>Settings</span>
            </div>
            {settingsItems.map((item) => (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-5 rounded-xl px-3 py-4 transition",
                      "hover:bg-primary/10 hover:shadow",
                      "text-muted-foreground hover:text-primary font-semibold",
                      isCollapsed ? "justify-center" : "",
                      "duration-200 relative"
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className={cn(isCollapsed ? "sr-only" : "inline")}>{item.label}</span>
                    {isCollapsed && (
                      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.alt}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.alt}</TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider> 
        </nav> 
      </div>
    </aside>
  );
}