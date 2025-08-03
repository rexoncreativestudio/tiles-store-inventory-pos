"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function AddSaleRedirectButton() {
  const router = useRouter();
  const handleClick = () => {
    router.push('/pos');
  };

  return (
    <Button onClick={handleClick}>
      <PlusCircle className="mr-2 h-4 w-4" /> Add New Sale
    </Button>
  );
}