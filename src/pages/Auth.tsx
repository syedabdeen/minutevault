import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowRight, Mic, Shield, Zap, Users } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    mobile: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.mobile || !formData.email) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    
    // Simulate authentication
    setTimeout(() => {
      localStorage.setItem("mom_user", JSON.stringify(formData));
      toast.success("Welcome to MoM AI!");
      navigate("/dashboard");
    }, 1000);
  };

  const features = [
    {
      icon: Mic,
      title: "Voice Recognition",
      description: "AI-powered speaker identification",
    },
    {
      icon: Zap,
      title: "Instant MoM",
      description: "Auto-generate professional minutes",
    },
    {
      icon: Users,
      title: "Multi-Speaker",
      description: "Track up to 20 unique speakers",
    },
    {
      icon: Shield,
      title: "Enterprise Ready",
      description: "Secure & audit-compliant",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent" />
        
        {/* Animated grid pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary)/0.1) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)/0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Logo size="lg" />

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold leading-tight">
                Transform Your Meetings into{" "}
                <span className="gradient-text">Professional Documents</span>
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-md">
                AI-powered meeting transcription with speaker recognition.
                Generate audit-ready minutes in seconds.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="glass rounded-xl p-4 hover:border-primary/50 transition-colors"
                >
                  <feature.icon size={24} className="text-primary mb-2" />
                  <h3 className="font-medium text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Trusted by enterprise teams worldwide
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md fade-in">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Get Started</CardTitle>
              <CardDescription>
                Enter your details to access MoM AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full mt-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="animate-pulse">Authenticating...</span>
                  ) : (
                    <>
                      Continue to Dashboard
                      <ArrowRight size={18} />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground mt-6">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
