import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Shield,
  Clock,
  MessageSquare,
} from "lucide-react";

interface WhitelistRequest {
  id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface AdminWhitelistRequestsProps {
  onRefresh: () => void;
}

export function AdminWhitelistRequests({ onRefresh }: AdminWhitelistRequestsProps) {
  const [requests, setRequests] = useState<WhitelistRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WhitelistRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [adminResponse, setAdminResponse] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("whitelist_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch user profiles for each request
      if (requestsData && requestsData.length > 0) {
        const userIds = requestsData.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        const enrichedRequests = requestsData.map(request => {
          const profile = profiles?.find(p => p.id === request.user_id);
          return {
            ...request,
            user_email: profile?.email || "Unknown",
            user_name: profile?.full_name || "Unknown",
          };
        });

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load whitelist requests");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Pending", variant: "outline" as const, icon: Clock, color: "text-warning" };
      case "approved":
        return { label: "Approved", variant: "default" as const, icon: CheckCircle, color: "text-success" };
      case "rejected":
        return { label: "Rejected", variant: "destructive" as const, icon: XCircle, color: "text-destructive" };
      default:
        return { label: status, variant: "outline" as const, icon: Clock, color: "text-muted-foreground" };
    }
  };

  const handleAction = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update request status
      const { error: updateError } = await supabase
        .from("whitelist_requests")
        .update({
          status: actionType === "approve" ? "approved" : "rejected",
          admin_response: adminResponse || null,
          responded_by: user?.id,
          responded_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      // If approved, update user's whitelist status
      if (actionType === "approve") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_whitelisted: true })
          .eq("id", selectedRequest.user_id);

        if (profileError) throw profileError;
      }

      toast.success(`Request ${actionType === "approve" ? "approved" : "rejected"} successfully`);
      fetchRequests();
      onRefresh();
      setDialogOpen(false);
      setAdminResponse("");
    } catch (error) {
      console.error("Error processing request:", error);
      toast.error("Failed to process request");
    } finally {
      setProcessing(false);
    }
  };

  const openDialog = (request: WhitelistRequest, type: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminResponse("");
    setDialogOpen(true);
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                Whitelist Requests
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingCount} Pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Manage multi-device access requests from users</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border/50 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading requests...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No whitelist requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => {
                  const { label, variant, icon: StatusIcon, color } = getStatusBadge(request.status);
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.user_name}</p>
                          <p className="text-sm text-muted-foreground">{request.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm truncate" title={request.reason}>
                          {request.reason}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant} className={`gap-1 ${color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {request.status === "pending" ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openDialog(request, "approve")}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(request, "reject")}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {request.admin_response ? (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                Response sent
                              </span>
                            ) : (
                              "Processed"
                            )}
                          </span>
                        )}
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
                {actionType === "approve" ? "Approve Request" : "Reject Request"}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest && `Request from: ${selectedRequest.user_name} (${selectedRequest.user_email})`}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* User's Reason */}
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <Label className="text-xs text-muted-foreground">User's Reason</Label>
                <p className="text-sm mt-1">{selectedRequest?.reason}</p>
              </div>

              {/* Admin Response */}
              <div className="space-y-2">
                <Label htmlFor="adminResponse">Response (Optional)</Label>
                <Textarea
                  id="adminResponse"
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Enter a response message for the user..."
                  rows={3}
                />
              </div>

              {/* Action Preview */}
              <div className={`flex items-center gap-3 p-4 rounded-lg ${
                actionType === "approve" 
                  ? 'bg-success/10 border border-success/20' 
                  : 'bg-destructive/10 border border-destructive/20'
              }`}>
                {actionType === "approve" ? (
                  <Shield className="w-6 h-6 text-success" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive" />
                )}
                <div>
                  <p className="font-medium">
                    {actionType === "approve" ? 'Approve Multi-Device Access' : 'Reject Request'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {actionType === "approve" 
                      ? 'User will be whitelisted and can log in from multiple devices' 
                      : 'User will remain restricted to single device'}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={processing}>
                Cancel
              </Button>
              <Button
                variant={actionType === "approve" ? "default" : "destructive"}
                onClick={handleAction}
                disabled={processing}
              >
                {processing ? "Processing..." : actionType === "approve" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}