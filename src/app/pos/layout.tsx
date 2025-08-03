"use client";

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Only this! No header, no buttons, no title! */}
      <main className="flex-grow">
        {children}
      </main>
    </div>
  ); 
}