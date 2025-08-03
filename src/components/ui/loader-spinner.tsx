// components/ui/loader-spinner.tsx
import { Loader2 } from 'lucide-react';

export default function LoaderSpinner({ size = 40 }) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 className="animate-spin text-gray-600" width={size} height={size} />
    </div>
  );
}