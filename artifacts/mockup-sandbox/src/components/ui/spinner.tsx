import { Loader2Icon } from "lucide-react";
import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner }
