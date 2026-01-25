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
import { Loader2, UserPlus, Pencil, Trash2, Copy, CheckCircle, Mail, X, Clock, Link2 } from "lucide-react";
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

// Form schema for inviting a user
const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

// Invitation type
interface Invitation {
  id: number;
  email: string;
  role: string;
  status: string;
  inviteLink?: string;
  inviterName?: string;
  createdAt: string;
  expiresAt: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [webhookUrlCopied, setWebhookUrlCopied] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState<number | null>(null);
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);
  
  // Only admin, CEO, or COO should access this page
  const canManageUsers = user?.role === 'admin' || user?.role === 'ceo' || user?.role === 'coo';
  
  // Fetch all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: canManageUsers,
  });

  // Fetch pending invitations
  const { data: pendingInvitations = [], isLoading: isLoadingInvitations } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations'],
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

  // Form for inviting a user
  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
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

  // Reset invite form when dialog is opened/closed
  const handleInviteDialogChange = (open: boolean) => {
    if (!open) {
      inviteForm.reset();
      setNewInviteLink(null);
    }
    setShowInviteDialog(open);
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

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const response = await apiRequest("POST", "/api/invitations", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation created",
        description: "Copy the invite link and share it with the user",
      });
      setNewInviteLink(data.inviteLink);
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/invitations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error cancelling invitation",
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

  // Handle invitation form submission
  const onInviteSubmit = (data: InviteFormData) => {
    createInvitationMutation.mutate(data);
  };

  // Handle cancel invitation
  const handleCancelInvitation = (id: number) => {
    if (confirm("Are you sure you want to cancel this invitation?")) {
      cancelInvitationMutation.mutate(id);
    }
  };

  // Copy invite link to clipboard
  const copyInviteLink = (link: string, invitationId?: number) => {
    navigator.clipboard.writeText(link);
    if (invitationId) {
      setInviteLinkCopied(invitationId);
      setTimeout(() => setInviteLinkCopied(null), 2000);
    }
    toast({
      title: "Link copied",
      description: "Invite link copied to clipboard",
    });
  };

  // Format time ago
  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
          <div className="flex gap-2">
            <Button onClick={() => handleInviteDialogChange(true)} variant="outline" className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span>Invite User</span>
            </Button>
            <Button onClick={() => handleNewUserDialogChange(true)} className="flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              <span>Add User</span>
            </Button>
          </div>
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

      {/* Pending Invitations */}
      {pendingInvitations.filter(inv => inv.status === "pending").length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations waiting to be accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations
                  .filter(inv => inv.status === "pending")
                  .map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {invitation.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="px-2 py-1 inline-block rounded-full text-xs bg-slate-100 text-slate-700">
                          {formatRoleName(invitation.role)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatTimeAgo(invitation.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteLink(
                              `${window.location.origin}/invite/${(invitation as any).token || ''}`,
                              invitation.id
                            )}
                            className="text-xs"
                          >
                            {inviteLinkCopied === invitation.id ? (
                              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            Copy Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
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

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={handleInviteDialogChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invite link to add a new team member. They'll create their own account using the link.
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="colleague@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={inviteForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hiringManager">Hiring Manager</SelectItem>
                        <SelectItem value="projectManager">Project Manager</SelectItem>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="coo">COO</SelectItem>
                        <SelectItem value="ceo">CEO</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {newInviteLink && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Invitation Created!</span>
                  </div>
                  <p className="text-sm text-green-600 mb-3">
                    Copy this link and share it with the user. The link expires in 72 hours.
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      value={newInviteLink} 
                      readOnly 
                      className="text-xs bg-white"
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => copyInviteLink(newInviteLink)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {newInviteLink ? "Done" : "Cancel"}
                  </Button>
                </DialogClose>
                {!newInviteLink && (
                  <Button 
                    type="submit"
                    disabled={createInvitationMutation.isPending}
                  >
                    {createInvitationMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-2 h-4 w-4" />
                        Create Invite Link
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}