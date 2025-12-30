import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search,
  Crown,
  Clock,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  created_at: string;
  subscription: {
    plan: string;
    trial_start_date: string | null;
    trial_end_date: string | null;
    lifetime_activated_at: string | null;
    payment_status: string;
  } | null;
}

interface AdminUsersProps {
  onRefresh: () => void;
}

export function AdminUsers({ onRefresh }: AdminUsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [extendDays, setExtendDays] = useState("7");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"extend" | "activate" | "convert">("extend");

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

      // Fetch subscriptions for each user
      const usersWithSubs = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", profile.id)
            .maybeSingle();

          return {
            ...profile,
            subscription: subscription ? {
              plan: subscription.plan,
              trial_start_date: subscription.trial_start_date,
              trial_end_date: subscription.trial_end_date,
              lifetime_activated_at: subscription.lifetime_activated_at,
              payment_status: subscription.payment_status,
            } : null,
          };
        })
      );

      setUsers(usersWithSubs);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionStatus = (user: User) => {
    if (!user.subscription) return { status: "none", label: "No Subscription", variant: "outline" as const };
    
    const { plan, trial_end_date, payment_status } = user.subscription;
    
    if (plan === "lifetime" && payment_status === "completed") {
      return { status: "lifetime", label: "Lifetime", variant: "default" as const };
    }
    
    if (plan === "lifetime" && payment_status === "pending") {
      return { status: "pending", label: "Pending Activation", variant: "secondary" as const };
    }
    
    if (plan === "trial") {
      const isActive = trial_end_date && new Date(trial_end_date) > new Date();
      return isActive
        ? { status: "trial", label: "Trial Active", variant: "outline" as const }
        : { status: "expired", label: "Trial Expired", variant: "destructive" as const };
    }
    
    return { status: "unknown", label: "Unknown", variant: "outline" as const };
  };

  const handleExtendTrial = async () => {
    if (!selectedUser) return;

    try {
      const days = parseInt(extendDays);
      const currentEndDate = selectedUser.subscription?.trial_end_date
        ? new Date(selectedUser.subscription.trial_end_date)
        : new Date();
      
      const newEndDate = new Date(Math.max(currentEndDate.getTime(), Date.now()));
      newEndDate.setDate(newEndDate.getDate() + days);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          trial_end_date: newEndDate.toISOString(),
          plan: "trial",
        })
        .eq("user_id", selectedUser.id);

      if (error) throw error;

      toast.success(`Trial extended by ${days} days`);
      fetchUsers();
      onRefresh();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error extending trial:", error);
      toast.error("Failed to extend trial");
    }
  };

  const handleActivateLifetime = async () => {
    if (!selectedUser) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan: "lifetime",
          payment_status: "completed",
          lifetime_activated_at: new Date().toISOString(),
          activated_by: user?.id,
        })
        .eq("user_id", selectedUser.id);

      if (error) throw error;

      toast.success("Lifetime access activated!");
      fetchUsers();
      onRefresh();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error activating lifetime:", error);
      toast.error("Failed to activate lifetime access");
    }
  };

  const handleConvertToLifetime = async () => {
    if (!selectedUser) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan: "lifetime",
          payment_status: "completed",
          lifetime_activated_at: new Date().toISOString(),
          activated_by: user?.id,
        })
        .eq("user_id", selectedUser.id);

      if (error) throw error;

      toast.success("Converted to lifetime access!");
      fetchUsers();
      onRefresh();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error converting to lifetime:", error);
      toast.error("Failed to convert to lifetime");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const openDialog = (user: User, type: "extend" | "activate" | "convert") => {
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
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Trial Ends</TableHead>
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
                  const { status, label, variant } = getSubscriptionStatus(user);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.subscription?.plan === "lifetime" ? (
                            <Crown className="w-4 h-4 text-primary" />
                          ) : (
                            <Clock className="w-4 h-4 text-accent" />
                          )}
                          <span className="capitalize">{user.subscription?.plan || "None"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {user.subscription?.trial_end_date
                          ? format(new Date(user.subscription.trial_end_date), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {status === "trial" || status === "expired" ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDialog(user, "extend")}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Extend
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openDialog(user, "convert")}
                              >
                                <Crown className="w-3 h-3 mr-1" />
                                Convert
                              </Button>
                            </>
                          ) : status === "pending" ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openDialog(user, "activate")}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Activate
                            </Button>
                          ) : status === "lifetime" ? (
                            <Badge variant="outline" className="text-success border-success/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : null}
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
                {actionType === "extend" && "Extend Trial Period"}
                {actionType === "activate" && "Activate Lifetime Access"}
                {actionType === "convert" && "Convert to Lifetime"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser && `User: ${selectedUser.full_name} (${selectedUser.email})`}
              </DialogDescription>
            </DialogHeader>

            {actionType === "extend" && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="days">Number of days to extend</Label>
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    value={extendDays}
                    onChange={(e) => setExtendDays(e.target.value)}
                  />
                </div>
              </div>
            )}

            {(actionType === "activate" || actionType === "convert") && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
                  <Crown className="w-6 h-6 text-success" />
                  <div>
                    <p className="font-medium">Lifetime Access</p>
                    <p className="text-sm text-muted-foreground">
                      User will have permanent access to all features
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
                variant="gradient"
                onClick={() => {
                  if (actionType === "extend") handleExtendTrial();
                  else if (actionType === "activate") handleActivateLifetime();
                  else handleConvertToLifetime();
                }}
              >
                {actionType === "extend" && "Extend Trial"}
                {actionType === "activate" && "Activate"}
                {actionType === "convert" && "Convert to Lifetime"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}