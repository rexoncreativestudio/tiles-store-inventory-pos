"use client";

import MainNavSidebar from "@/components/main-nav-sidebar";
import POSButton from "@/components/pos-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu, Users2 } from "lucide-react";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Breadcrumb from "@/components/ui/breadcrumb"; // Import Breadcrumb

export default function AppShell({ children, role }: { children: React.ReactNode; role: string | null }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Define routes that should use a minimal layout (no sidebar, header, or breadcrumb)
  const minimalLayoutPages = [
    "/dashboard/stock-controller",
    "/dashboard/stock-manager",
    "/pos",
  ];
  const isMinimalLayoutPage = minimalLayoutPages.some(path => pathname.startsWith(path));

  // Hide entire shell for cashier or on the login page
  const isLoginPage = pathname === "/login" || pathname === "/";
  if (role === "cashier" || isLoginPage) {
    return <>{children}</>;
  }

  // Hide header, breadcrumb, and footer on receipt page
  const isReceiptPage = pathname === "/receipt" || pathname.startsWith("/receipt/");

  const showHeader = !isReceiptPage && !isMinimalLayoutPage;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex flex-1 w-full">
        {/* Sidebar - Render only if not a minimal layout page */}
        {!isMinimalLayoutPage && (
          <>
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
              <MainNavSidebar />
            </div>
            {/* Mobile Sidebar Drawer */}
            {mobileSidebarOpen && (
              <div className="fixed inset-0 z-50 md:hidden bg-black/40" onClick={() => setMobileSidebarOpen(false)}>
                <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-lg" onClick={e => e.stopPropagation()}>
                  <MainNavSidebar mobile onClose={() => setMobileSidebarOpen(false)} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Main Content Area - Adjust margin if sidebar is hidden */}
        <div
          className={`flex flex-col flex-1 relative transition-all duration-300 ${
            !isMinimalLayoutPage ? "md:ml-[var(--sidebar-width,72px)]" : ""
          }`}
        >
          {/* Header - Hide on receipt and minimal layout pages */}
          {showHeader && (
            <header className="flex h-20 items-center justify-between gap-4 px-6 md:px-8 bg-white shadow-md border-b border-gray-200 fixed w-full left-0 top-0 z-10">
              {/* Mobile hamburger + logo */}
              <div className="flex items-center gap-2 md:hidden">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setMobileSidebarOpen(true)}>
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open Navigation</span>
                </Button>
                <span className="font-bold text-lg">MEGA COMPANY</span>
              </div>
              {/* Desktop header spacer */}
              <div className="hidden md:flex flex-grow"></div>
              {/* Action Icons */}
              <div className="flex items-center gap-3">
                <POSButton />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full shadow">
                      <Users2 className="h-5 w-5" />
                      <span className="sr-only">Toggle user menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info("Support functionality is not yet implemented.")}>Support</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => {
                      const { error } = await supabaseClient.auth.signOut();
                      if (error) {
                        toast.error("Logout failed.", { description: error.message });
                      } else {
                        toast.success("Logged out successfully!");
                        router.push('/');
                      }
                    }}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
          )}

          {/* Main Body - Adjust top padding if header is hidden */}
          <main
            className={`px-3 sm:px-8 pb-8 w-full min-h-[calc(100vh-5rem)] bg-gray-100 transition-all duration-300 ${
              showHeader ? "pt-24" : "pt-8"
            }`}
            style={{
              marginLeft: '0px',
              ...(isReceiptPage && { paddingTop: 0, paddingBottom: 0, background: 'transparent', minHeight: '100vh' }),
            }}
          >
            <div className="max-w-[1800px] mx-auto w-full h-full">
              {/* Breadcrumb - Hide on minimal layout and receipt pages */}
              {!isMinimalLayoutPage && !isReceiptPage && <Breadcrumb />}
              {children}
            </div>
          </main>
        </div>
      </div>
      {/* Footer - Hide only on receipt page */}
      {!isReceiptPage && (
        <footer className="w-full flex justify-center items-center py-3 px-4 bg-white border-t border-gray-200 text-sm text-muted-foreground fixed bottom-0 left-0 z-20">
          POS By Rexon Creative Studio
        </footer>
      )}
    </div>
  );
} 