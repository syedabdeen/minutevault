import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Smartphone,
  Shield,
  UserX,
  UserCheck,
} from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  created_at: string;
  device_id: string | null;
  is_whitelisted: boolean;
  status: string;
}

interface AdminUsersProps {
  onRefresh: () => void;
}

export function AdminUsers({ onRefresh }: AdminUsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"reset_device" | "toggle_status" | "toggle_whitelist">("reset_device");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(profiles || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (user: User) => {
    if (user.status === 'disabled') {
      return { label: "Disabled", variant: "destructive" as const, icon: XCircle };
    }
    return { label: "Active", variant: "default" as const, icon: CheckCircle };
  };

  const handleResetDevice = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .rpc('reset_device_binding', { _user_id: selectedUser.id });

      if (error) throw error;

      toast.success("Device binding reset successfully");
      fetchUsers();
      onRefresh();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error resetting device:", error);
      toast.error("Failed to reset device binding");
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;

    try {
      const newStatus = selectedUser.status === 'active' ? 'disabled' : 'active';
      
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success(`User ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`);
      fetchUsers();
      onRefresh();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleToggleWhitelist = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_whitelisted: !selectedUser.is_whitelisted })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success(`Whitelist ${!selectedUser.is_whitelisted ? 'enabled' : 'disabled'} for user`);
      fetchUsers();
      onRefresh();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error toggling whitelist:", error);
      toast.error("Failed to update whitelist status");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const openDialog = (user: User, type: "reset_device" | "toggle_status" | "toggle_whitelist") => {
    setSelectedUser(user);
    setActionType(type);
    setDialogOpen(true);
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage all registered users</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <div className="rounded-md border border-border/50 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Whitelist</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const { label, variant, icon: StatusIcon } = getStatusBadge(user);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={variant} className="gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.device_id ? (
                          <Badge variant="outline" className="gap-1">
                            <Smartphone className="w-3 h-3" />
                            Bound
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not bound</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_whitelisted ? (
                          <Badge className="bg-success/20 text-success border-success/30 gap-1">
                            <Shield className="w-3 h-3" />
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.device_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(user, "reset_device")}
                            >
                              <Smartphone className="w-3 h-3 mr-1" />
                              Reset
                            </Button>
                          )}
                          <Button
                            variant={user.status === 'active' ? "outline" : "default"}
                            size="sm"
                            onClick={() => openDialog(user, "toggle_status")}
                          >
                            {user.status === 'active' ? (
                              <>
                                <UserX className="w-3 h-3 mr-1" />
                                Disable
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3 mr-1" />
                                Enable
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDialog(user, "toggle_whitelist")}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {user.is_whitelisted ? "Unwhitelist" : "Whitelist"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Action Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "reset_device" && "Reset Device Binding"}
                {actionType === "toggle_status" && (selectedUser?.status === 'active' ? "Disable User" : "Enable User")}
                {actionType === "toggle_whitelist" && (selectedUser?.is_whitelisted ? "Remove from Whitelist" : "Add to Whitelist")}
              </DialogTitle>
              <DialogDescription>
                {selectedUser && `User: ${selectedUser.full_name} (${selectedUser.email})`}
              </DialogDescription>
            </DialogHeader>

            {actionType === "reset_device" && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <Smartphone className="w-6 h-6 text-warning" />
                  <div>
                    <p className="font-medium">Reset Device Binding</p>
                    <p className="text-sm text-muted-foreground">
                      This will allow the user to log in from a new device
                    </p>
                  </div>
                </div>
              </div>
            )}

            {actionType === "toggle_status" && (
              <div className="py-4">
                <div className={`flex items-center gap-3 p-4 rounded-lg ${
                  selectedUser?.status === 'active' 
                    ? 'bg-destructive/10 border border-destructive/20' 
                    : 'bg-success/10 border border-success/20'
                }`}>
                  {selectedUser?.status === 'active' ? (
                    <UserX className="w-6 h-6 text-destructive" />
                  ) : (
                    <UserCheck className="w-6 h-6 text-success" />
                  )}
                  <div>
                    <p className="font-medium">
                      {selectedUser?.status === 'active' ? 'Disable Account' : 'Enable Account'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser?.status === 'active' 
                        ? 'User will be blocked from logging in' 
                        : 'User will be able to log in again'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {actionType === "toggle_whitelist" && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <Shield className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-medium">
                      {selectedUser?.is_whitelisted ? 'Remove from Whitelist' : 'Add to Whitelist'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser?.is_whitelisted 
                        ? 'User will be subject to device restrictions' 
                        : 'User can log in from multiple devices'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={actionType === "toggle_status" && selectedUser?.status === 'active' ? "destructive" : "default"}
                onClick={() => {
                  if (actionType === "reset_device") handleResetDevice();
                  else if (actionType === "toggle_status") handleToggleStatus();
                  else handleToggleWhitelist();
                }}
              >
                {actionType === "reset_device" && "Reset Device"}
                {actionType === "toggle_status" && (selectedUser?.status === 'active' ? "Disable" : "Enable")}
                {actionType === "toggle_whitelist" && "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
