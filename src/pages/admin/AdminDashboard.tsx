import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  Shield,
  Smartphone,
  Settings,
  LogOut,
  FileText,
  RefreshCw,
  UserCheck,
  UserX,
} from "lucide-react";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminSettings } from "@/components/admin/AdminSettings";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  deviceBoundUsers: number;
  whitelistedUsers: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    disabledUsers: 0,
    deviceBoundUsers: 0,
    whitelistedUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/admin/login");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast.error("Access denied");
      navigate("/admin/login");
    }
  };

  const fetchStats = async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*");

      if (profiles) {
        setStats({
          totalUsers: profiles.length,
          activeUsers: profiles.filter(p => p.status === 'active').length,
          disabledUsers: profiles.filter(p => p.status === 'disabled').length,
          deviceBoundUsers: profiles.filter(p => p.device_id).length,
          whitelistedUsers: profiles.filter(p => p.is_whitelisted).length,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/admin/login");
  };

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-foreground" },
    { label: "Active Users", value: stats.activeUsers, icon: UserCheck, color: "text-success" },
    { label: "Disabled Users", value: stats.disabledUsers, icon: UserX, color: "text-destructive" },
    { label: "Device Bound", value: stats.deviceBoundUsers, icon: Smartphone, color: "text-accent" },
    { label: "Whitelisted", value: stats.whitelistedUsers, icon: Shield, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <Badge variant="outline" className="text-primary border-primary/30">
              Admin Dashboard
            </Badge>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label} className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>
                      {loading ? "..." : stat.value}
                    </p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <AdminUsers onRefresh={fetchStats} />
          </TabsContent>

          <TabsContent value="reports">
            <AdminReports />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
