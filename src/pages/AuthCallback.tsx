import { useEffect } from "react";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const { handleAuthCallback } = useGoogleAuth();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
