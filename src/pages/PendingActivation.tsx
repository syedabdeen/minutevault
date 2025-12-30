import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Mail, ArrowLeft } from "lucide-react";

export default function PendingActivation() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <Logo size="lg" />
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-warning" />
            </div>
            <CardTitle className="text-2xl">Activation Pending</CardTitle>
            <CardDescription>
              Your account is registered and awaiting activation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Thank you for choosing MinuteVault Lifetime Access!
              </p>
              <p>
                To complete your purchase, please make the payment and contact our admin team for activation.
              </p>
              <div className="flex items-center justify-center gap-2 text-foreground">
                <Mail className="w-4 h-4" />
                <span>admin@minutevault.com</span>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button
                variant="gradient"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Go to Login
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/pricing")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Pricing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}