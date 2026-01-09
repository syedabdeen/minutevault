import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDeviceId } from "@/utils/deviceId";

export function useGoogleAuth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const signInWithGoogle = async () => {
    setIsLoading(true);

    try {
      // In embedded contexts (like the Lovable preview iframe), Google OAuth can throw 403.
      // We request the URL without auto-redirect, then navigate the *top* window.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("Google sign-in error:", error);
        toast.error(error.message || "Failed to sign in with Google");
        return;
      }

      if (!data?.url) {
        toast.error("Failed to start Google sign-in (missing redirect URL)");
        return;
      }

      console.log("[GoogleAuth] Redirecting to:", data.url);

      // If we're inside an iframe (common in preview tools), open OAuth in a new tab.
      // Google often blocks OAuth in embedded contexts with 403.
      const isEmbedded = (() => {
        try {
          return window.self !== window.top;
        } catch {
          return true;
        }
      })();

      if (isEmbedded) {
        const newTab = window.open(data.url, "_blank", "noopener,noreferrer");
        if (!newTab) {
          // Popup blocked; fall back to same-tab navigation
          window.location.assign(data.url);
        }
      } else {
        window.location.assign(data.url);
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthCallback = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        throw new Error("Failed to get session after OAuth");
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
        // Continue with login if function doesn't exist yet
      } else if (bindingResult) {
        const result = bindingResult as { allowed: boolean; reason: string };
        if (!result.allowed) {
          toast.error(result.reason || "Login blocked");
          await supabase.auth.signOut();
          navigate("/login");
          return;
        }
      }

      // Get or create profile
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
        // Profile should be created by trigger, but store basic info
        localStorage.setItem("mom_user", JSON.stringify({
          fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email,
          mobile: user.user_metadata?.phone || null,
        }));
      }

      toast.success("Welcome to MinuteVault!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Auth callback error:", error);
      toast.error("Failed to complete sign in");
      navigate("/login");
    }
  };

  return {
    signInWithGoogle,
    handleAuthCallback,
    isLoading,
  };
}
