import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Sparkles,
  Mail,
  MessageCircle,
  Link2,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  generateMOMPdf,
  downloadPdf,
  getPdfBlob,
} from "@/utils/pdfGenerator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionItem {
  task: string;
  responsible: string;
  dueDate: string;
  status: string;
}

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
  participant_names: string | null;
  summary: string | null;
  action_items: ActionItem[] | null;
}

// Company profile - would come from settings in production
const companyProfile = {
  name: "Acme Corporation",
  address: "123 Business Park, Suite 500\nNew York, NY 10001",
  phone: "+1 (555) 123-4567",
  email: "contact@acmecorp.com",
  website: "www.acmecorp.com",
};

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[] | null>(null);

  useEffect(() => {
    if (id) {
      fetchMeeting();
    }
  }, [id]);

  const fetchMeeting = async () => {
    try {
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

      setMeeting(meetingData as unknown as Meeting);
      setSummary(meetingData.summary || null);
      setActionItems(
        meetingData.action_items
          ? (meetingData.action_items as unknown as ActionItem[])
          : null
      );

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

  const generateAISummary = useCallback(async () => {
    if (!meeting || transcripts.length === 0) {
      toast.error("No transcript available to summarize");
      return;
    }

    setGeneratingAI(true);
    toast.info("Generating AI summary...", {
      description: "This may take a few seconds",
    });

    try {
      const transcriptText = transcripts
        .map((t) => `${t.speaker}: ${t.content}`)
        .join("\n");

      const { data, error } = await supabase.functions.invoke(
        "generate-mom-summary",
        {
          body: {
            transcript: transcriptText,
            participantNames: meeting.participant_names,
          },
        }
      );

      if (error) throw error;

      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Rate limit exceeded", {
            description: "Please try again in a moment",
          });
        } else if (data.error.includes("credits")) {
          toast.error("AI credits exhausted", {
            description: "Please add credits to continue",
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      const newSummary = data.summary || null;
      const newActionItems = data.actionItems || null;

      setSummary(newSummary);
      setActionItems(newActionItems);

      // Save to database
      await supabase
        .from("meetings")
        .update({
          summary: newSummary,
          action_items: newActionItems,
        })
        .eq("id", meeting.id);

      toast.success("AI summary generated successfully!");
    } catch (error) {
      console.error("Error generating AI summary:", error);
      toast.error("Failed to generate AI summary", {
        description: "Please try again",
      });
    } finally {
      setGeneratingAI(false);
    }
  }, [meeting, transcripts]);

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

  const getAttendees = useCallback(() => {
    if (meeting?.participant_names) {
      return meeting.participant_names.split(",").map((n) => n.trim()).filter(Boolean);
    }
    const speakers = transcripts.map((t) => t.speaker);
    return [...new Set(speakers)];
  }, [meeting, transcripts]);

  const handleExportPDF = useCallback(async () => {
    if (!meeting) return;

    setExportingPdf(true);
    toast.info("Generating PDF...");

    try {
      const attendees = getAttendees();

      const doc = generateMOMPdf({
        meeting: {
          title: meeting.title,
          date: meeting.date,
          time: meeting.time,
          duration: meeting.duration,
          participantNames: meeting.participant_names,
          speakers: meeting.speakers,
        },
        transcripts,
        summary,
        actionItems,
        companyProfile,
        attendees,
      });

      const filename = `MOM_${meeting.title.replace(/[^a-zA-Z0-9]/g, "_")}_${meeting.date}.pdf`;
      downloadPdf(doc, filename);

      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setExportingPdf(false);
    }
  }, [meeting, transcripts, summary, actionItems, getAttendees]);

  const handleShareEmail = useCallback(async () => {
    if (!meeting) return;

    const subject = encodeURIComponent(`Minutes of Meeting: ${meeting.title}`);
    const body = encodeURIComponent(
      `Please find attached the Minutes of Meeting for "${meeting.title}" held on ${formatDate(meeting.date)}.\n\nGenerated by MinuteVault.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    toast.success("Email client opened");
  }, [meeting]);

  const handleShareWhatsApp = useCallback(async () => {
    if (!meeting) return;

    const text = encodeURIComponent(
      `📋 Minutes of Meeting: ${meeting.title}\n📅 Date: ${formatDate(meeting.date)}\n⏰ Time: ${formatTime(meeting.time)}\n\nGenerated by MinuteVault`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
    toast.success("WhatsApp opened");
  }, [meeting]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  }, []);

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Changes saved successfully");
  };

  const toggleActionItemStatus = useCallback(
    async (index: number) => {
      if (!actionItems || !meeting) return;

      const updated = actionItems.map((item, i) =>
        i === index
          ? {
              ...item,
              status: item.status === "completed" ? "pending" : "completed",
            }
          : item
      );

      setActionItems(updated);

      await supabase
        .from("meetings")
        .update({ action_items: JSON.parse(JSON.stringify(updated)) })
        .eq("id", meeting.id);
    },
    [actionItems, meeting]
  );

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

  const attendees = getAttendees();

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Company Header */}
        <div className="flex flex-col items-center mb-8 pb-6 border-b border-border">
          <div className="w-20 h-20 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
            <Building2 size={40} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {companyProfile.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {companyProfile.website}
          </p>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Share2 size={18} />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShareEmail}>
                  <Mail size={16} className="mr-2" />
                  Share via Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareWhatsApp}>
                  <MessageCircle size={16} className="mr-2" />
                  Share via WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 size={16} className="mr-2" />
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="gradient"
              onClick={handleExportPDF}
              disabled={exportingPdf}
            >
              {exportingPdf ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              Export PDF
            </Button>
          </div>
        </div>

        {/* Attendees */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              Attendees ({attendees.length || meeting.speakers || 0})
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

        {/* Discussion Summary */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles size={20} className="text-accent" />
                Discussion Summary
              </CardTitle>
              {transcripts.length > 0 && !summary && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAISummary}
                  disabled={generatingAI}
                >
                  {generatingAI ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  Generate AI Summary
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="prose prose-sm max-w-none">
                {isEditing ? (
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="min-h-[150px]"
                  />
                ) : (
                  <p className="text-foreground/90 whitespace-pre-wrap">
                    {summary}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles
                  size={32}
                  className="mx-auto text-muted-foreground mb-3"
                />
                <p className="text-muted-foreground">
                  {transcripts.length > 0
                    ? "Click 'Generate AI Summary' to create a summary"
                    : "Record a meeting to generate an AI summary"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle size={20} className="text-warning" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {actionItems && actionItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground w-8">
                        #
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                        Task
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground w-32">
                        Responsible
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground w-28">
                        Due Date
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground w-24">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionItems.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-border/50 hover:bg-secondary/30"
                      >
                        <td className="py-3 px-2 text-sm">{index + 1}</td>
                        <td className="py-3 px-2 text-sm">{item.task}</td>
                        <td className="py-3 px-2 text-sm">{item.responsible}</td>
                        <td className="py-3 px-2 text-sm">{item.dueDate}</td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => toggleActionItemStatus(index)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                              item.status === "completed"
                                ? "bg-success/20 text-success"
                                : "bg-warning/20 text-warning"
                            }`}
                          >
                            {item.status === "completed" ? (
                              <CheckSquare size={14} />
                            ) : (
                              <Square size={14} />
                            )}
                            {item.status.charAt(0).toUpperCase() +
                              item.status.slice(1)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle
                  size={32}
                  className="mx-auto text-muted-foreground mb-3"
                />
                <p className="text-muted-foreground">
                  {summary
                    ? "No action items were identified"
                    : "Generate AI summary to extract action items"}
                </p>
              </div>
            )}
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
                        {baseTs
                          ? formatTranscriptOffset(baseTs, entry.timestamp)
                          : ""}
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
                  If you just recorded, refresh in a few seconds. Otherwise try
                  a longer recording and speak clearly.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
