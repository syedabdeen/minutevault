import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  Loader2,
} from "lucide-react";

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string | null;
  speakers: number | null;
  status: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMeetings: 0,
    hoursRecorded: 0,
    speakersIdentified: 0,
    actionItems: 0,
  });
  const { lightTap } = useHapticFeedback();

  const fetchMeetings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, title, date, time, duration, speakers, status")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      setMeetings(data || []);

      // Calculate stats from all meetings
      const { data: allMeetings, error: statsError } = await supabase
        .from("meetings")
        .select("duration, speakers, action_items");

      if (!statsError && allMeetings) {
        let totalMinutes = 0;
        let totalSpeakers = 0;
        let totalActionItems = 0;

        allMeetings.forEach((m) => {
          // Parse duration (e.g., "1h 30min", "45min", "< 1 min")
          if (m.duration) {
            const hourMatch = m.duration.match(/(\d+)h/);
            const minMatch = m.duration.match(/(\d+)min/);
            if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
            if (minMatch) totalMinutes += parseInt(minMatch[1]);
          }
          totalSpeakers += m.speakers || 0;
          if (m.action_items && Array.isArray(m.action_items)) {
            totalActionItems += m.action_items.length;
          }
        });

        setStats({
          totalMeetings: allMeetings.length,
          hoursRecorded: Math.round((totalMinutes / 60) * 10) / 10,
          speakersIdentified: totalSpeakers,
          actionItems: totalActionItems,
        });
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
      toast.error("Failed to load meetings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const filteredMeetings = meetings.filter((meeting) =>
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await fetchMeetings();
    toast.success("Dashboard refreshed");
  }, [fetchMeetings]);

  const handleCardClick = (path: string) => {
    lightTap();
    navigate(path);
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const statsDisplay = [
    {
      label: "Total Meetings",
      value: stats.totalMeetings.toString(),
      icon: FileText,
    },
    {
      label: "Hours Recorded",
      value: stats.hoursRecorded.toString(),
      icon: Clock,
    },
    {
      label: "Speakers Identified",
      value: stats.speakersIdentified.toString(),
      icon: Users,
    },
    {
      label: "Action Items",
      value: stats.actionItems.toString(),
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
            {statsDisplay.map((stat) => (
              <Card key={stat.label} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
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
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredMeetings.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No meetings yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start your first recording to see meetings here
                  </p>
                  <Button onClick={() => navigate("/meeting/new")}>
                    <Plus size={18} />
                    New Meeting
                  </Button>
                </div>
              ) : (
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
                            {formatTime(meeting.time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {meeting.speakers || 0} speakers
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {meeting.duration || "—"}
                        </span>
                        <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PullToRefresh>
    </Layout>
  );
}