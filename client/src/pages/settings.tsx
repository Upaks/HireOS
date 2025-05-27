import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import { User, UserRoles } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, UserPlus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import UserManagement from "@/components/users/user-management";

// Form schema for creating a new user
const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Only admin, CEO, or COO should access this page
  const canManageUsers = user?.role === 'admin' || user?.role === 'ceo' || user?.role === 'coo';
  
  // Fetch all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: canManageUsers,
  });
  
  // Form for creating a new user
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "hiringManager",
    },
  });
  
  // Form for editing an existing user
  const editForm = useForm<Omit<UserFormData, 'password'>>({
    resolver: zodResolver(userFormSchema.omit({ password: true })),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      role: "hiringManager",
    },
  });
  
  // Reset form when dialog is opened/closed
  const handleNewUserDialogChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setShowNewUserDialog(open);
  };
  
  // Reset edit form when dialog is opened/closed
  const handleEditUserDialogChange = (open: boolean) => {
    if (!open) {
      editForm.reset();
    }
    setShowEditUserDialog(open);
  };
  
  // Set up edit form when a user is selected for editing
  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    editForm.reset({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    });
    setShowEditUserDialog(true);
  };
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The user was created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      handleNewUserDialogChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Omit<UserFormData, 'password'> }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user was updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      handleEditUserDialogChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user was deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission for creating a new user
  const onSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };
  
  // Handle form submission for editing a user
  const onEditSubmit = (data: Omit<UserFormData, 'password'>) => {
    if (currentUser) {
      updateUserMutation.mutate({ id: currentUser.id, data });
    }
  };
  
  // Handle user deletion
  const handleDeleteUser = (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(id);
    }
  };
  
  // Format role name for display
  const formatRoleName = (role: string) => {
    switch(role) {
      case 'hiringManager':
        return 'Hiring Manager';
      case 'projectManager':
        return 'Project Manager';
      case 'coo':
        return 'COO';
      case 'ceo':
        return 'CEO';
      case 'director':
        return 'Director';
      case 'admin':
        return 'Administrator';
      default:
        return role;
    }
  };
  
  // Check if a user is an admin, CEO, COO, or Director
  const isAdminOrExecutive = (role: string) => {
    return role === 'admin' || role === 'ceo' || role === 'coo' || role === 'director';
  };

  if (!canManageUsers) {
    return (
      <AppShell>
        <TopBar title="Settings" />
        <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4 text-center max-w-md mx-auto">
            <div className="rounded-full bg-destructive/10 p-6 w-24 h-24 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m0 0v2m0-2h2m-2 0H10m10-6H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              Only administrators, CEOs, and COOs can access system settings.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }
  
  return (
    <AppShell>
      <TopBar title="System Settings" />
      
      <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage users, permissions, and system configuration
          </p>
        </div>
        
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="system">System Configuration</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>Manage system-wide settings and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-12 text-slate-500">
                  System configuration settings coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Connect HireOS with external services and APIs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-12 text-slate-500">
                  Integration settings coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* New User Dialog */}
      <Dialog open={showNewUserDialog} onOpenChange={handleNewUserDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. Users will receive their login credentials.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UserRoles.HIRING_MANAGER}>Hiring Manager</SelectItem>
                        <SelectItem value={UserRoles.PROJECT_MANAGER}>Project Manager</SelectItem>
                        {(user?.role === 'ceo' || user?.role === 'admin') && (
                          <>
                            <SelectItem value={UserRoles.COO}>Chief Operating Officer</SelectItem>
                            <SelectItem value={UserRoles.CEO}>Chief Executive Officer</SelectItem>
                          </>
                        )}
                        {user?.role === 'admin' && (
                          <SelectItem value={UserRoles.ADMIN}>Administrator</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={showEditUserDialog} onOpenChange={handleEditUserDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UserRoles.HIRING_MANAGER}>Hiring Manager</SelectItem>
                        <SelectItem value={UserRoles.PROJECT_MANAGER}>Project Manager</SelectItem>
                        {(user?.role === 'ceo' || user?.role === 'admin') && (
                          <>
                            <SelectItem value={UserRoles.COO}>Chief Operating Officer</SelectItem>
                            <SelectItem value={UserRoles.CEO}>Chief Executive Officer</SelectItem>
                          </>
                        )}
                        {user?.role === 'admin' && (
                          <SelectItem value={UserRoles.ADMIN}>Administrator</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit"
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}