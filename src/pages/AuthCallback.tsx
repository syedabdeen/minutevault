import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDeviceId } from "@/utils/deviceId";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Check for error in URL params
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const errorParam = params.get("error") || hashParams.get("error");
      const errorDescription = params.get("error_description") || hashParams.get("error_description");
      
      if (errorParam) {
        throw new Error(errorDescription || errorParam);
      }

      // Check for authorization code (PKCE flow)
      const code = params.get("code");
      
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          throw exchangeError;
        }
      }

      // Wait for session to be available (retry a few times)
      let session = null;
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          session = data.session;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!session) {
        throw new Error("Failed to establish session");
      }

      const user = session.user;
      const deviceId = getDeviceId();

      // Check device binding
      const { data: bindingResult, error: bindingError } = await supabase
        .rpc('check_device_binding', {
          _user_id: user.id,
          _device_id: deviceId
        });

      if (bindingError) {
        console.error("Device binding check error:", bindingError);
      } else if (bindingResult) {
        const result = bindingResult as { allowed: boolean; reason: string };
        if (!result.allowed) {
          toast.error(result.reason || "Login blocked");
          await supabase.auth.signOut();
          navigate("/login");
          return;
        }
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        localStorage.setItem("mom_user", JSON.stringify({
          fullName: profile.full_name,
          email: profile.email,
          mobile: profile.mobile,
        }));
      } else {
        localStorage.setItem("mom_user", JSON.stringify({
          fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email,
          mobile: user.user_metadata?.phone || null,
        }));
      }

      toast.success("Welcome to MinuteVault!");
      navigate("/dashboard");
    } catch (err) {
      console.error("Auth callback error:", err);
      setError(err instanceof Error ? err.message : "Failed to complete sign in");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in failed</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/login")}>
              Back to Login
            </Button>
            <Button onClick={() => { setError(null); handleCallback(); }}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
