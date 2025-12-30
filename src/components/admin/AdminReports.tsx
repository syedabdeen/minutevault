import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FileText,
  Download,
  Users,
  Clock,
  Crown,
  DollarSign,
  Activity,
} from "lucide-react";

interface ReportData {
  users: any[];
  subscriptions: any[];
  pricing: any;
}

export function AdminReports() {
  const [reportType, setReportType] = useState("users");
  const [dateRange, setDateRange] = useState("all");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const [profilesRes, subscriptionsRes, pricingRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*"),
        supabase.from("pricing_settings").select("*").limit(1).maybeSingle(),
      ]);

      setData({
        users: profilesRes.data || [],
        subscriptions: subscriptionsRes.data || [],
        pricing: pricingRes.data,
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
    }
  };

  const filterByDateRange = (items: any[], dateField: string) => {
    if (dateRange === "all") return items;

    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case "7days":
        startDate = subDays(now, 7);
        break;
      case "30days":
        startDate = subDays(now, 30);
        break;
      case "thisMonth":
        startDate = startOfMonth(now);
        break;
      default:
        return items;
    }

    return items.filter((item) => new Date(item[dateField]) >= startDate);
  };

  const generatePDF = async () => {
    if (!data) return;

    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("MinuteVault Admin Report", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${format(new Date(), "PPP 'at' p")}`, pageWidth / 2, 28, { align: "center" });
      doc.text(`Report Type: ${getReportTitle()}`, pageWidth / 2, 34, { align: "center" });

      let yPos = 45;

      switch (reportType) {
        case "users":
          generateUsersReport(doc, yPos);
          break;
        case "activeTrials":
          generateActiveTrialsReport(doc, yPos);
          break;
        case "expiredTrials":
          generateExpiredTrialsReport(doc, yPos);
          break;
        case "lifetime":
          generateLifetimeReport(doc, yPos);
          break;
        case "revenue":
          generateRevenueReport(doc, yPos);
          break;
        default:
          break;
      }

      doc.save(`minutevault-${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Report downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const generateUsersReport = (doc: jsPDF, startY: number) => {
    if (!data) return;

    const filteredUsers = filterByDateRange(data.users, "created_at");
    const usersWithSubs = filteredUsers.map((user) => {
      const sub = data.subscriptions.find((s) => s.user_id === user.id);
      return {
        name: user.full_name,
        email: user.email,
        plan: sub?.plan || "None",
        status: getStatus(sub),
        registered: format(new Date(user.created_at), "MMM d, yyyy"),
      };
    });

    autoTable(doc, {
      startY,
      head: [["Name", "Email", "Plan", "Status", "Registered"]],
      body: usersWithSubs.map((u) => [u.name, u.email, u.plan, u.status, u.registered]),
      theme: "striped",
      headStyles: { fillColor: [11, 60, 93] },
    });
  };

  const generateActiveTrialsReport = (doc: jsPDF, startY: number) => {
    if (!data) return;

    const now = new Date();
    const activeTrials = data.subscriptions.filter(
      (s) => s.plan === "trial" && new Date(s.trial_end_date) > now
    );

    const trialUsers = activeTrials.map((sub) => {
      const user = data.users.find((u) => u.id === sub.user_id);
      return {
        name: user?.full_name || "Unknown",
        email: user?.email || "Unknown",
        startDate: format(new Date(sub.trial_start_date), "MMM d, yyyy"),
        endDate: format(new Date(sub.trial_end_date), "MMM d, yyyy"),
        daysLeft: Math.ceil((new Date(sub.trial_end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });

    autoTable(doc, {
      startY,
      head: [["Name", "Email", "Start Date", "End Date", "Days Left"]],
      body: trialUsers.map((u) => [u.name, u.email, u.startDate, u.endDate, u.daysLeft.toString()]),
      theme: "striped",
      headStyles: { fillColor: [31, 122, 140] },
    });
  };

  const generateExpiredTrialsReport = (doc: jsPDF, startY: number) => {
    if (!data) return;

    const now = new Date();
    const expiredTrials = data.subscriptions.filter(
      (s) => s.plan === "trial" && new Date(s.trial_end_date) <= now
    );

    const expiredUsers = expiredTrials.map((sub) => {
      const user = data.users.find((u) => u.id === sub.user_id);
      return {
        name: user?.full_name || "Unknown",
        email: user?.email || "Unknown",
        expiredOn: format(new Date(sub.trial_end_date), "MMM d, yyyy"),
      };
    });

    autoTable(doc, {
      startY,
      head: [["Name", "Email", "Expired On"]],
      body: expiredUsers.map((u) => [u.name, u.email, u.expiredOn]),
      theme: "striped",
      headStyles: { fillColor: [220, 53, 69] },
    });
  };

  const generateLifetimeReport = (doc: jsPDF, startY: number) => {
    if (!data) return;

    const lifetimeUsers = data.subscriptions.filter(
      (s) => s.plan === "lifetime" && s.payment_status === "completed"
    );

    const ltUsers = lifetimeUsers.map((sub) => {
      const user = data.users.find((u) => u.id === sub.user_id);
      return {
        name: user?.full_name || "Unknown",
        email: user?.email || "Unknown",
        activatedOn: sub.lifetime_activated_at
          ? format(new Date(sub.lifetime_activated_at), "MMM d, yyyy")
          : "N/A",
      };
    });

    autoTable(doc, {
      startY,
      head: [["Name", "Email", "Activated On"]],
      body: ltUsers.map((u) => [u.name, u.email, u.activatedOn]),
      theme: "striped",
      headStyles: { fillColor: [40, 167, 69] },
    });
  };

  const generateRevenueReport = (doc: jsPDF, startY: number) => {
    if (!data) return;

    const lifetimeCount = data.subscriptions.filter(
      (s) => s.plan === "lifetime" && s.payment_status === "completed"
    ).length;

    const price = data.pricing?.lifetime_price || 10;
    const totalRevenue = lifetimeCount * price;

    doc.setFontSize(14);
    doc.text("Revenue Summary", 14, startY);

    autoTable(doc, {
      startY: startY + 10,
      head: [["Metric", "Value"]],
      body: [
        ["Total Lifetime Purchases", lifetimeCount.toString()],
        ["Price per License", `$${price}`],
        ["Total Revenue", `$${totalRevenue.toFixed(2)}`],
      ],
      theme: "striped",
      headStyles: { fillColor: [11, 60, 93] },
    });
  };

  const getStatus = (sub: any) => {
    if (!sub) return "No Subscription";
    if (sub.plan === "lifetime" && sub.payment_status === "completed") return "Lifetime Active";
    if (sub.plan === "lifetime" && sub.payment_status === "pending") return "Pending Activation";
    if (sub.plan === "trial") {
      return new Date(sub.trial_end_date) > new Date() ? "Trial Active" : "Trial Expired";
    }
    return "Unknown";
  };

  const getReportTitle = () => {
    switch (reportType) {
      case "users": return "All Users";
      case "activeTrials": return "Active Trials";
      case "expiredTrials": return "Expired Trials";
      case "lifetime": return "Lifetime Purchases";
      case "revenue": return "Revenue Summary";
      default: return "Report";
    }
  };

  const reportOptions = [
    { value: "users", label: "All Users", icon: Users },
    { value: "activeTrials", label: "Active Trials", icon: Clock },
    { value: "expiredTrials", label: "Expired Trials", icon: Activity },
    { value: "lifetime", label: "Lifetime Purchases", icon: Crown },
    { value: "revenue", label: "Revenue Summary", icon: DollarSign },
  ];

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Reports & Exports
        </CardTitle>
        <CardDescription>Generate and download PDF reports</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="w-4 h-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button variant="gradient" onClick={generatePDF} disabled={loading}>
          <Download className="w-4 h-4 mr-2" />
          {loading ? "Generating..." : "Download PDF Report"}
        </Button>
      </CardContent>
    </Card>
  );
}