import { useState, useEffect } from "react";
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
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TranscriptEntry {
  id: string;
  speaker: string;
  content: string;
  timestamp: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string | null;
  speakers: number | null;
  status: string;
}

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);

  useEffect(() => {
    if (id) {
      fetchMeeting();
    }
  }, [id]);

  const fetchMeeting = async () => {
    try {
      // Fetch meeting
      const { data: meetingData, error: meetingError } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (meetingError) throw meetingError;

      if (!meetingData) {
        toast.error("Meeting not found");
        navigate("/meetings");
        return;
      }

      setMeeting(meetingData);

      // Fetch transcripts
      const { data: transcriptData, error: transcriptError } = await supabase
        .from("transcripts")
        .select("*")
        .eq("meeting_id", id)
        .order("timestamp", { ascending: true });

      if (transcriptError) throw transcriptError;
      setTranscripts(transcriptData || []);
    } catch (error) {
      console.error("Error fetching meeting:", error);
      toast.error("Failed to load meeting");
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return date;
    }
  };

  const formatTranscriptOffset = (baseIso: string, iso: string) => {
    try {
      const base = new Date(baseIso).getTime();
      const current = new Date(iso).getTime();
      const delta = Math.max(0, current - base);
      const mins = Math.floor(delta / 60000);
      const secs = Math.floor((delta % 60000) / 1000);
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  const getUniqueAttendees = () => {
    const speakers = transcripts.map((t) => t.speaker);
    return [...new Set(speakers)];
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={48} className="animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!meeting) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Meeting Not Found</h1>
          <Button onClick={() => navigate("/meetings")}>
            <ArrowLeft size={18} />
            Back to Meetings
          </Button>
        </div>
      </Layout>
    );
  }

  const attendees = getUniqueAttendees();

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
            <h1 className="text-3xl font-bold">{meeting.title}</h1>
            <div className="flex items-center gap-4 text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Calendar size={16} />
                {formatDate(meeting.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={16} />
                {formatTime(meeting.time)} • {meeting.duration || "N/A"}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={16} />
                Online Meeting
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
              Speakers ({attendees.length || meeting.speakers || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {attendees.length > 0 ? (
                attendees.map((attendee, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User size={16} className="text-primary" />
                    </div>
                    <span className="text-sm font-medium">{attendee}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  {meeting.speakers || 0} speaker(s) detected
                </p>
              )}
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
            {transcripts.length > 0 ? (
              <div className="space-y-4">
                {transcripts.map((entry, index) => {
                  const baseTs = transcripts[0]?.timestamp;

                  return (
                    <div
                      key={entry.id || index}
                      className="flex gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-16 pt-1 text-xs font-mono tabular-nums text-muted-foreground">
                        {baseTs ? formatTranscriptOffset(baseTs, entry.timestamp) : ""}
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
                            value={entry.content}
                            className="min-h-[60px]"
                            onChange={() => {}}
                          />
                        ) : (
                          <p className="text-foreground/90">{entry.content}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">
                  No transcript was saved for this meeting.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  If you just recorded, refresh in a few seconds. Otherwise try a
                  longer recording and speak clearly.
                </p>
              </div>
            )}
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
                placeholder="Add a summary of the discussion..."
              />
            ) : (
              <p className="text-muted-foreground text-center py-4">
                AI-generated summary will appear here
              </p>
            )}
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
            <p className="text-muted-foreground text-center py-4">
              AI-extracted action items will appear here
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
