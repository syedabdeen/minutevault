import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Check,
  Clock,
  Crown,
  ArrowRight,
  Shield,
  Zap,
  Users,
  FileText,
} from "lucide-react";

interface PricingSettings {
  lifetime_price: number;
  offer_enabled: boolean;
  offer_price: number | null;
  offer_start_date: string | null;
  offer_end_date: string | null;
  offer_description: string | null;
}

export default function Pricing() {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const { data, error } = await supabase
        .from("pricing_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setPricing(data);
    } catch (error) {
      console.error("Error fetching pricing:", error);
    } finally {
      setLoading(false);
    }
  };

  const isOfferActive = () => {
    if (!pricing?.offer_enabled || !pricing?.offer_price) return false;
    const now = new Date();
    const start = pricing.offer_start_date ? new Date(pricing.offer_start_date) : null;
    const end = pricing.offer_end_date ? new Date(pricing.offer_end_date) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  const displayPrice = isOfferActive() ? pricing?.offer_price : pricing?.lifetime_price;
  const originalPrice = isOfferActive() ? pricing?.lifetime_price : null;

  const trialFeatures = [
    "Full access to all features",
    "Unlimited meeting recordings",
    "AI-powered transcription",
    "Speaker recognition",
    "PDF export",
    "14 days free access",
  ];

  const lifetimeFeatures = [
    "Everything in Free Trial",
    "Lifetime access - pay once",
    "All future updates included",
    "Priority support",
    "No recurring fees",
    "No expiry",
  ];

  const highlights = [
    { icon: Zap, text: "AI-Powered Transcription" },
    { icon: Users, text: "Multi-Speaker Recognition" },
    { icon: FileText, text: "Professional MoM Export" },
    { icon: Shield, text: "Enterprise Security" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--accent)/0.1) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--accent)/0.1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <Logo />
        <Button variant="ghost" onClick={() => navigate("/login")}>
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 text-center px-8 py-12 max-w-4xl mx-auto">
        <Badge variant="secondary" className="mb-6">
          <Clock className="w-4 h-4 mr-2" />
          Simple, Transparent Pricing
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Choose Your <span className="gradient-text">MinuteVault</span> Plan
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Start with a free trial or unlock lifetime access. No hidden charges, no subscriptions.
        </p>

        {/* Feature Highlights */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {highlights.map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-sm text-muted-foreground">
              <item.icon className="w-4 h-4 text-accent" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative z-10 px-8 pb-24 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Trial */}
          <Card className="relative border-border/50 bg-card/50 backdrop-blur hover:border-accent/50 transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-accent border-accent">
                  <Clock className="w-3 h-3 mr-1" />
                  14 Days
                </Badge>
              </div>
              <CardTitle className="text-2xl">Free Trial</CardTitle>
              <CardDescription>
                Full access to explore all features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">$0</span>
                <span className="text-muted-foreground">/ 14 days</span>
              </div>

              <ul className="space-y-3">
                {trialFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => navigate("/register?plan=trial")}
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                No payment required. Trial expires automatically.
              </p>
            </CardContent>
          </Card>

          {/* Lifetime Access */}
          <Card className="relative border-primary/50 bg-card/50 backdrop-blur hover:border-primary transition-all">
            {isOfferActive() && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-success text-success-foreground">
                  🎉 {pricing?.offer_description || "Limited Time Offer!"}
                </Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  <Crown className="w-3 h-3 mr-1" />
                  Best Value
                </Badge>
              </div>
              <CardTitle className="text-2xl">Lifetime Access</CardTitle>
              <CardDescription>
                One-time payment, forever access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-2">
                {loading ? (
                  <span className="text-5xl font-bold">...</span>
                ) : (
                  <>
                    <span className="text-5xl font-bold">${displayPrice}</span>
                    {originalPrice && (
                      <span className="text-xl text-muted-foreground line-through">
                        ${originalPrice}
                      </span>
                    )}
                    <span className="text-muted-foreground">one-time</span>
                  </>
                )}
              </div>

              <ul className="space-y-3">
                {lifetimeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={() => navigate("/register?plan=lifetime")}
              >
                Buy Lifetime Access
                <Crown className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Manual activation by admin after payment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust Section */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Trusted by enterprise teams worldwide
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Bank-grade encryption</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Check className="w-5 h-5" />
              <span className="text-sm">No hidden charges</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-5 h-5" />
              <span className="text-sm">Instant activation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            © 2024 MinuteVault. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}