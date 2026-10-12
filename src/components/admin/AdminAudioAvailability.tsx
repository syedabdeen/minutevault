import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AdminAudioAvailability() {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void supabase.from("meeting_ai_access").select("blocked,message").eq("id", "audio").maybeSingle().then(({ data }) => {
      if (data?.blocked) setMessage(data.message || "Audio analysis is paused.");
    });
  }, []);
  if (!message) return null;
  return <div role="alert" className="mb-6 rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
    <p className="font-semibold">Audio analysis paused</p><p className="text-sm">{message}</p>
    <p className="text-sm text-muted-foreground">Restore the indicated access or credits before resuming. Saved recordings will not restart automatically.</p>
    <Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        const { data, error } = await supabase.functions.invoke("process-meeting-audio", { body: { resumeAccess: true } });
        if (error || !data?.resumed) throw error || new Error("Could not resume audio analysis.");
        setMessage(null); toast.success("Audio analysis enabled for new requests");
      } catch { toast.error("Could not resume audio analysis."); } finally { setBusy(false); }
    }}>Access restored — allow new requests</Button>
  </div>;
}