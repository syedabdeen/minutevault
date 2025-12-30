import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Share2,
  Edit3,
  Save,
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle,
  AlertCircle,
  User,
  FileText,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

interface TranscriptEntry {
  id: string;
  timestamp: number;
  speaker: string;
  text: string;
}

interface MeetingData {
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: string[];
  transcript: TranscriptEntry[];
  fullTranscript: string;
}

// Load meeting data from session storage or use mock data
const loadMeetingData = (id: string): MeetingData => {
  if (id === "new-recording") {
    const stored = sessionStorage.getItem("latestMeeting");
    if (stored) {
      const data = JSON.parse(stored);
      return {
        title: data.title,
        date: new Date(data.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: new Date(data.date).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        location: "Online Meeting",
        attendees: Array.from(
          new Set(data.transcripts?.map((t: TranscriptEntry) => t.speaker) || ["Speaker 1"])
        ) as string[],
        transcript: data.transcripts || [],
        fullTranscript: data.fullTranscript || "",
      };
    }
  }

  // Mock data fallback
  return {
    title: id === "new-recording" ? "Weekly Team Standup" : "Q4 Budget Review",
    date: "December 28, 2024",
    time: "10:00 AM - 10:45 AM",
    location: "Online (Microsoft Teams)",
    attendees: ["Ahmed Hassan", "Speaker 2", "Speaker 3", "Speaker 4"],
    transcript: [
      {
        id: "1",
        timestamp: 12000,
        speaker: "Ahmed Hassan",
        text: "Good morning everyone. Let's begin the Q4 budget review meeting.",
      },
      {
        id: "2",
        timestamp: 25000,
        speaker: "Speaker 2",
        text: "Thanks Ahmed. I've prepared the financial summary for this quarter.",
      },
      {
        id: "3",
        timestamp: 63000,
        speaker: "Ahmed Hassan",
        text: "Perfect. Can you walk us through the key highlights?",
      },
      {
        id: "4",
        timestamp: 75000,
        speaker: "Speaker 2",
        text: "Certainly. Revenue is up 15% compared to Q3, exceeding our projections by 3%.",
      },
      {
        id: "5",
        timestamp: 150000,
        speaker: "Speaker 3",
        text: "That's excellent news. How does this affect our expansion budget?",
      },
      {
        id: "6",
        timestamp: 165000,
        speaker: "Ahmed Hassan",
        text: "We should allocate an additional 10% to the expansion fund based on these numbers.",
      },
    ],
    fullTranscript: "",
  };
};

const mockActionItems = [
  {
    id: 1,
    action: "Prepare detailed Q4 financial report",
    responsible: "Finance Team",
    dueDate: "2024-12-30",
    status: "In Progress",
  },
  {
    id: 2,
    action: "Review expansion fund allocation",
    responsible: "Ahmed Hassan",
    dueDate: "2024-12-31",
    status: "Pending",
  },
  {
    id: 3,
    action: "Schedule follow-up meeting with stakeholders",
    responsible: "Executive Assistant",
    dueDate: "2025-01-02",
    status: "Pending",
  },
];

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [actionItems, setActionItems] = useState(mockActionItems);

  const meetingData = loadMeetingData(id || "1");
  const [transcript, setTranscript] = useState(meetingData.transcript);

  const formatTimestamp = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:00`;
  };

  const handleExportPDF = () => {
    toast.success("Generating PDF...", {
      description: "Your document will download shortly",
    });
  };

  const handleShare = () => {
    toast.success("Share link copied!", {
      description: "Anyone with the link can view this MoM",
    });
  };

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Changes saved successfully");
  };

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Company Header - From Settings */}
        <div className="flex flex-col items-center mb-8 pb-6 border-b border-border">
          <div className="w-20 h-20 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
            <Building2 size={40} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Acme Corporation</h2>
          <p className="text-sm text-muted-foreground">www.acmecorp.com</p>
        </div>

        {/* Meeting Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-success text-sm mb-2">
              <CheckCircle size={16} />
              <span>Transcription Complete</span>
            </div>
            <h1 className="text-3xl font-bold">{meetingData.title}</h1>
            <div className="flex items-center gap-4 text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Calendar size={16} />
                {meetingData.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={16} />
                {meetingData.time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={16} />
                {meetingData.location}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <Button variant="success" onClick={handleSave}>
                <Save size={18} />
                Save Changes
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit3 size={18} />
                Edit
              </Button>
            )}
            <Button variant="outline" onClick={handleShare}>
              <Share2 size={18} />
              Share
            </Button>
            <Button variant="gradient" onClick={handleExportPDF}>
              <Download size={18} />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Attendees */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              Attendees ({meetingData.attendees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {meetingData.attendees.map((attendee, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User size={16} className="text-primary" />
                  </div>
                  {isEditing ? (
                    <Input
                      value={attendee}
                      className="h-8 w-32"
                      onChange={() => {}}
                    />
                  ) : (
                    <span className="text-sm font-medium">{attendee}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              Meeting Transcript
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transcript.map((entry, index) => (
                <div
                  key={entry.id || index}
                  className="flex gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="text-xs font-mono text-muted-foreground whitespace-nowrap pt-1">
                    [{formatTimestamp(entry.timestamp)}]
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-primary">
                        {entry.speaker}
                      </span>
                      {entry.speaker.includes("Speaker") && (
                        <span className="text-xs px-2 py-0.5 rounded bg-warning/20 text-warning">
                          Unidentified
                        </span>
                      )}
                    </div>
                    {isEditing ? (
                      <Textarea
                        value={entry.text}
                        className="min-h-[60px]"
                        onChange={() => {}}
                      />
                    ) : (
                      <p className="text-foreground/90">{entry.text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Discussion Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Discussion Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                className="min-h-[150px]"
                defaultValue="The meeting commenced with a review of Q4 financial performance. Key highlights included a 15% revenue increase compared to Q3, surpassing projections by 3%. Discussion focused on implications for the expansion fund, with consensus to allocate an additional 10% to support growth initiatives. The team agreed to prepare detailed reports and schedule follow-up meetings with stakeholders."
              />
            ) : (
              <p className="text-foreground/90 leading-relaxed">
                The meeting commenced with a review of Q4 financial performance.
                Key highlights included a 15% revenue increase compared to Q3,
                surpassing projections by 3%. Discussion focused on implications
                for the expansion fund, with consensus to allocate an additional
                10% to support growth initiatives. The team agreed to prepare
                detailed reports and schedule follow-up meetings with
                stakeholders.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Decisions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Decisions Made</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle
                  size={18}
                  className="text-success flex-shrink-0 mt-0.5"
                />
                <span>
                  Approved additional 10% allocation to expansion fund based on
                  Q4 performance
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle
                  size={18}
                  className="text-success flex-shrink-0 mt-0.5"
                />
                <span>
                  Agreed to continue current revenue strategy with minor
                  optimizations
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle
                  size={18}
                  className="text-success flex-shrink-0 mt-0.5"
                />
                <span>
                  Scheduled stakeholder meeting for early January to discuss
                  expansion plans
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle size={20} className="text-warning" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Action Item
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Responsible
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Due Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {actionItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <Input
                            value={item.action}
                            className="h-8"
                            onChange={() => {}}
                          />
                        ) : (
                          item.action
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <Input
                            value={item.responsible}
                            className="h-8"
                            onChange={() => {}}
                          />
                        ) : (
                          item.responsible
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={item.dueDate}
                            className="h-8"
                            onChange={() => {}}
                          />
                        ) : (
                          item.dueDate
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === "In Progress"
                              ? "bg-primary/20 text-primary"
                              : "bg-warning/20 text-warning"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
