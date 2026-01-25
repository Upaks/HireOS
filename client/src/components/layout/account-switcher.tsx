import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building2, ChevronDown, Check, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface UserAccount {
  id: number;
  accountId: number;
  userId: number;
  role: string;
  joinedAt: string;
  accountName: string;
}

interface AccountsResponse {
  accounts: UserAccount[];
  activeAccountId: number | null;
}

interface AccountSwitcherProps {
  currentAccountId?: number;
  onAccountSwitch?: (accountId: number) => void;
}

export default function AccountSwitcher({ currentAccountId, onAccountSwitch }: AccountSwitcherProps) {
  const { toast } = useToast();

  // Fetch user's accounts
  const { data, isLoading } = useQuery<AccountsResponse>({
    queryKey: ["/api/user/accounts"],
  });

  // Extract accounts array and activeAccountId from response
  const accounts = data?.accounts || [];
  const activeAccountId = data?.activeAccountId || currentAccountId || null;

  // Switch account mutation
  const switchMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await apiRequest("POST", "/api/user/switch-account", { accountId });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Account switched",
        description: `Now viewing ${data.accountName}`,
      });
      // Invalidate all queries to refresh data for the new account
      queryClient.invalidateQueries();
      onAccountSwitch?.(data.accountId);
      // Reload the page to fully switch context
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Error switching account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Don't show if user only has one account
  if (isLoading || accounts.length <= 1) {
    return null;
  }

  const currentAccount = accounts.find(acc => acc.accountId === activeAccountId) || accounts[0];

  const formatRole = (role: string) => {
    switch(role) {
      case 'hiringManager': return 'Hiring Manager';
      case 'projectManager': return 'Project Manager';
      case 'coo': return 'COO';
      case 'ceo': return 'CEO';
      case 'director': return 'Director';
      case 'admin': return 'Admin';
      default: return role;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between px-3 py-2 h-auto text-left hover:bg-sidebar-accent"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{currentAccount?.accountName || "Account"}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {formatRole(currentAccount?.role || "")}
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch Account
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.accountId}
            onClick={() => {
              if (account.accountId !== activeAccountId) {
                switchMutation.mutate(account.accountId);
              }
            }}
            className="cursor-pointer"
            disabled={switchMutation.isPending}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{account.accountName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatRole(account.role)}
                </p>
              </div>
              {account.accountId === activeAccountId && (
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              )}
              {switchMutation.isPending && switchMutation.variables === account.accountId && (
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
