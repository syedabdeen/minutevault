import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <Logo size="lg" />
        </div>

        <h1 className="text-3xl font-bold mb-4">Install MinuteVault</h1>
        <p className="text-muted-foreground mb-8">
          Install MinuteVault on your device for quick access and offline support.
        </p>

        {isInstalled ? (
          <Card className="mb-8">
            <CardContent className="p-6 text-center">
              <CheckCircle size={48} className="mx-auto text-success mb-4" />
              <h2 className="text-xl font-semibold mb-2">Already Installed!</h2>
              <p className="text-muted-foreground">
                MinuteVault is installed on your device. You can find it on your home screen.
              </p>
            </CardContent>
          </Card>
        ) : isIOS ? (
          <Card className="mb-8">
            <CardContent className="p-6">
              <Smartphone size={48} className="mx-auto text-accent mb-4" />
              <h2 className="text-xl font-semibold mb-4">Install on iOS</h2>
              <ol className="text-left text-sm text-muted-foreground space-y-3">
                <li className="flex items-start gap-2">
                  <span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                  <span>Tap the Share button in Safari's toolbar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                  <span>Scroll down and tap "Add to Home Screen"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                  <span>Tap "Add" to confirm</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Button variant="gradient" size="xl" onClick={handleInstall} className="mb-8">
            <Download size={24} />
            Install App
          </Button>
        ) : (
          <Card className="mb-8">
            <CardContent className="p-6">
              <Smartphone size={48} className="mx-auto text-accent mb-4" />
              <h2 className="text-xl font-semibold mb-4">Install on Android</h2>
              <ol className="text-left text-sm text-muted-foreground space-y-3">
                <li className="flex items-start gap-2">
                  <span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                  <span>Tap the menu icon (⋮) in Chrome</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                  <span>Tap "Install app" or "Add to Home screen"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                  <span>Tap "Install" to confirm</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}

        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Go Back
        </Button>
      </div>
    </div>
  );
}
