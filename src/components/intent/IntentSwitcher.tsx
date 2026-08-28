import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useShoppingIntent } from "@/hooks/useShoppingIntent";

export function IntentSwitcher({ className }: { className?: string }) {
  const { isBusiness, setIntent } = useShoppingIntent();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={className}>
          <span className="mr-1">{isBusiness ? "🏢" : "🛍️"}</span>
          <span className="hidden md:inline">{isBusiness ? "Buying for Business" : "Shopping for myself"}</span>
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={() => setIntent("individual")} className="gap-2">
          🛍️ <span>Individual shopping</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setIntent("business")} className="gap-2">
          🏢 <span>Business buying</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
