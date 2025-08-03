"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

export default function POSButton() {
    const router = useRouter();

    const handleClick = () => {
        router.push('/pos');
    };

    return (
        <Button
            onClick={handleClick}
            variant="secondary"
            size="sm"
            className="h-9 gap-1 hover:bg-primary/10 hover:text-primary hover:shadow transition"
        >
            <ShoppingCart className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">POS</span>
        </Button>
    );
}