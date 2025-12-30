import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Mic,
  FileText,
  Users,
  Zap,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Globe,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mic,
      title: "Smart Recording",
      description:
        "High-quality audio capture with automatic noise reduction and voice enhancement.",
    },
    {
      icon: Users,
      title: "Speaker Recognition",
      description:
        "AI-powered diarization identifies and labels each speaker automatically.",
    },
    {
      icon: Zap,
      title: "Instant Transcription",
      description:
        "Real-time speech-to-text with 99% accuracy across 100+ languages.",
    },
    {
      icon: FileText,
      title: "Professional MoM",
      description:
        "Auto-generate audit-ready minutes with summaries, decisions, and action items.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "Bank-grade encryption and compliance with global data protection standards.",
    },
    {
      icon: Globe,
      title: "Multi-language",
      description:
        "Support for regional languages and customizable document formatting.",
    },
  ];

  const benefits = [
    "Save 3+ hours per meeting on documentation",
    "Never miss a key decision or action item",
    "Maintain consistent, professional meeting records",
    "Share and export with one click",
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

      {/* Hero Section with Centered Logo */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-8 pt-16">
        <div className="fade-in mb-12">
          <Logo size="lg" />
        </div>
        
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm mb-8">
            <Zap size={16} className="text-accent" />
            <span>AI-Powered Meeting Documentation</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Transform Meetings into{" "}
            <span className="gradient-text">Professional Minutes</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Record, transcribe, and generate enterprise-grade Minutes of Meeting
            documents with AI-powered speaker recognition and smart summaries.
          </p>

          <div className="flex items-center justify-center gap-4 mb-12">
            <Button
              variant="gradient"
              size="xl"
              onClick={() => navigate("/auth")}
            >
              Start Free
              <ArrowRight size={20} />
            </Button>
            <Button variant="outline" size="xl">
              Watch Demo
            </Button>
          </div>

          {/* Benefits */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle size={16} className="text-success" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}

      {/* Features Grid */}
      <section className="relative z-10 px-8 py-24 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need for{" "}
            <span className="gradient-text">Perfect Meeting Records</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI handles the complexity so you can focus on what matters -
            productive meetings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass rounded-2xl p-6 hover:border-primary/50 transition-all group slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 group-hover:shadow-glow transition-shadow">
                <feature.icon size={24} className="text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-8 py-24">
        <div className="max-w-4xl mx-auto text-center glass rounded-3xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Revolutionize Your Meetings?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
          Join thousands of enterprise teams using MinuteVault to save time and
          improve meeting documentation.
        </p>
        <Button
          variant="gradient"
          size="xl"
          onClick={() => navigate("/auth")}
        >
          Get Started for Free
          <ArrowRight size={20} />
        </Button>
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
};

export default Index;
