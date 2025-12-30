import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search,
  Calendar,
  Clock,
  Users,
  FileText,
  Download,
  ChevronRight,
  Filter,
} from "lucide-react";

// Mock data for all meetings
const allMeetings = [
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
  {
    id: "5",
    title: "Marketing Strategy Review",
    date: "2024-12-24",
    time: "3:00 PM",
    duration: "50 min",
    speakers: 5,
    status: "completed",
  },
  {
    id: "6",
    title: "Technical Architecture Discussion",
    date: "2024-12-23",
    time: "10:30 AM",
    duration: "1h 30min",
    speakers: 4,
    status: "completed",
  },
  {
    id: "7",
    title: "HR Policy Update Meeting",
    date: "2024-12-22",
    time: "11:00 AM",
    duration: "40 min",
    speakers: 3,
    status: "completed",
  },
  {
    id: "8",
    title: "Annual Performance Review Setup",
    date: "2024-12-21",
    time: "2:30 PM",
    duration: "55 min",
    speakers: 6,
    status: "completed",
  },
];

export default function AllMeetings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const filteredMeetings = allMeetings.filter((meeting) => {
    const matchesSearch = meeting.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDate = dateFilter ? meeting.date === dateFilter : true;
    return matchesSearch && matchesDate;
  });

  return (
    <Layout>
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

        {/* Meetings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeetings.map((meeting) => (
            <Card
              key={meeting.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => navigate(`/meeting/${meeting.id}`)}
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
                      {meeting.time} • {meeting.duration}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} />
                    <span>{meeting.speakers} speakers</span>
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

        {filteredMeetings.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText
                size={48}
                className="mx-auto text-muted-foreground mb-4"
              />
              <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
