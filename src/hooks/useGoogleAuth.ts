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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Google sign-in error:", error);
        toast.error("Failed to sign in with Google");
        setIsLoading(false);
        return;
      }

      // The redirect will happen automatically
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("An unexpected error occurred");
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
