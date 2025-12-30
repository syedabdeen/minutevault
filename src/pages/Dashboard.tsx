import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  FileText,
  Mic,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

// Mock data for meetings
const mockMeetings = [
  {
    id: "1",
    title: "Q4 Budget Review",
    date: "2024-12-28",
    time: "10:00 AM",
    duration: "45 min",
    speakers: 4,
    status: "completed",
  },
  {
    id: "2",
    title: "Product Roadmap Discussion",
    date: "2024-12-27",
    time: "2:00 PM",
    duration: "1h 15min",
    speakers: 6,
    status: "completed",
  },
  {
    id: "3",
    title: "Client Onboarding - Acme Corp",
    date: "2024-12-26",
    time: "11:30 AM",
    duration: "30 min",
    speakers: 3,
    status: "completed",
  },
  {
    id: "4",
    title: "Weekly Sprint Planning",
    date: "2024-12-25",
    time: "9:00 AM",
    duration: "1h",
    speakers: 8,
    status: "completed",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { lightTap } = useHapticFeedback();

  const filteredMeetings = mockMeetings.filter((meeting) =>
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = useCallback(async () => {
    // Simulate data refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Dashboard refreshed");
  }, []);

  const handleCardClick = (path: string) => {
    lightTap();
    navigate(path);
  };

  const stats = [
    {
      label: "Total Meetings",
      value: "24",
      change: "+12%",
      icon: FileText,
    },
    {
      label: "Hours Recorded",
      value: "36.5",
      change: "+8%",
      icon: Clock,
    },
    {
      label: "Speakers Identified",
      value: "47",
      change: "+15%",
      icon: Users,
    },
    {
      label: "Action Items",
      value: "89",
      change: "+23%",
      icon: TrendingUp,
    },
  ];

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's your meeting overview.
            </p>
          </div>
          <Button variant="gradient" size="lg" onClick={() => navigate("/meeting/new")}>
            <Plus size={20} />
            New Meeting
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-success mt-1">{stat.change} this month</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon size={24} className="text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-glow transition-all group active:scale-[0.98]"
            onClick={() => handleCardClick("/meeting/new")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Mic size={28} className="text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Start Recording</h3>
                <p className="text-sm text-muted-foreground">
                  Begin a new meeting session
                </p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors group active:scale-[0.98]"
            onClick={() => handleCardClick("/meetings")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                <FileText size={28} className="text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">View All MoMs</h3>
                <p className="text-sm text-muted-foreground">
                  Access meeting archive
                </p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors group active:scale-[0.98]"
            onClick={() => handleCardClick("/settings")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                <Users size={28} className="text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Company Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Configure settings
                </p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Meetings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Meetings</CardTitle>
            <div className="relative w-64">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  onClick={() => handleCardClick(`/meeting/${meeting.id}`)}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors group active:bg-secondary/70"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                      {meeting.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {meeting.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {meeting.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {meeting.speakers} speakers
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {meeting.duration}
                    </span>
                    <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </PullToRefresh>
    </Layout>
  );
}
