import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { toast } from "sonner";
import {
  Search,
  Calendar,
  Clock,
  Users,
  FileText,
  Download,
  ChevronRight,
  Filter,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string | null;
  speakers: number | null;
  status: string;
}

export default function AllMeetings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const { lightTap } = useHapticFeedback();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchMeetings();
    toast.success("Meetings refreshed");
  }, [fetchMeetings]);

  const handleMeetingClick = (id: string) => {
    lightTap();
    navigate(`/meeting/${id}`);
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch = meeting.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDate = dateFilter ? meeting.date === dateFilter : true;
    return matchesSearch && matchesDate;
  });

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const h = parseInt(hours);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">All Meetings</h1>
            <p className="text-muted-foreground mt-1">
              Browse and manage your meeting archive
            </p>
          </div>
          <Button variant="gradient" onClick={() => navigate("/meeting/new")}>
            New Meeting
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search meetings by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-44"
                />
              </div>
              {(searchQuery || dateFilter) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery("");
                    setDateFilter("");
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {/* Meetings Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeetings.map((meeting) => (
              <Card
                key={meeting.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group active:scale-[0.98]"
                onClick={() => handleMeetingClick(meeting.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText size={24} className="text-primary" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle download
                      }}
                    >
                      <Download size={16} />
                    </Button>
                  </div>

                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {meeting.title}
                  </h3>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>{meeting.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>
                        {formatTime(meeting.time)} • {meeting.duration || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} />
                      <span>{meeting.speakers || 0} speakers</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success">
                      Completed
                    </span>
                    <ChevronRight
                      size={18}
                      className="text-muted-foreground group-hover:text-primary transition-colors"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredMeetings.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText
                size={48}
                className="mx-auto text-muted-foreground mb-4"
              />
              <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
              <p className="text-muted-foreground mb-4">
                {meetings.length === 0
                  ? "Start recording your first meeting"
                  : "Try adjusting your search or filter criteria"}
              </p>
              {meetings.length === 0 && (
                <Button
                  variant="gradient"
                  onClick={() => navigate("/meeting/new")}
                >
                  Record New Meeting
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </PullToRefresh>
    </Layout>
  );
}
