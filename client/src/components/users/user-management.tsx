import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, UserPlus, Pencil, Trash2, Copy, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, UserRoles } from "@shared/schema";

// Form schema for creating a new user
const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
  calendarLink: z.string().url("Invalid calendar URL").optional().or(z.literal("")),
  calendarProvider: z.enum(["calendly", "cal.com", "google", "custom"]).optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [webhookUrlCopied, setWebhookUrlCopied] = useState(false);
  
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
  const editFormSchema = userFormSchema.omit({ password: true });
  type EditUserFormData = z.infer<typeof editFormSchema>;
  
  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      role: "hiringManager",
      calendarLink: "",
      calendarProvider: undefined,
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
      calendarLink: (user as any).calendarLink || "",
      calendarProvider: (user as any).calendarProvider || "",
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
  const onEditSubmit = (data: EditUserFormData) => {
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </div>
          <Button onClick={() => handleNewUserDialogChange(true)} className="flex items-center gap-1">
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-slate-500">{user.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className={`px-2 py-1 inline-block rounded-full text-xs ${
                        isAdminOrExecutive(user.role) 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {formatRoleName(user.role)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
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
              
              <FormField
                control={editForm.control}
                name="calendarLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calendar Scheduling Link</FormLabel>
                    <FormControl>
                      <Input 
                        type="url" 
                        placeholder="https://calendly.com/your-username/meeting" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Your personal calendar link (Calendly, Cal.com, etc.). Used when sending interview invitations.
                    </p>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
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

              <FormField
                control={editForm.control}
                name="calendarProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calendar Provider</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Auto-generate booking link if Google Calendar is selected
                        if (value === "google" && currentUser) {
                          const baseUrl = window.location.origin;
                          editForm.setValue("calendarLink", `${baseUrl}/book/${currentUser.id}`);
                        }
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select calendar provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="calendly">Calendly</SelectItem>
                        <SelectItem value="cal.com">Cal.com</SelectItem>
                        <SelectItem value="google">Google Calendar (HireOS Booking)</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="calendarLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calendar Scheduling Link</FormLabel>
                    <FormControl>
                      <Input 
                        type="url" 
                        placeholder={
                          editForm.watch("calendarProvider") === "google"
                            ? "Auto-generated booking link"
                            : "https://calendly.com/your-username/meeting"
                        }
                        {...field}
                        readOnly={editForm.watch("calendarProvider") === "google"}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      {editForm.watch("calendarProvider") === "google"
                        ? "Your Google Calendar booking link (auto-generated). Share this with candidates."
                        : "Your personal calendar link (Calendly, Cal.com, etc.). Used when sending interview invitations."}
                    </p>
                  </FormItem>
                )}
              />
              </div>
              
              <DialogFooter className="mt-4">
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
    </>
  );
}