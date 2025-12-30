import { Mic, FileText, Users, Clock } from "lucide-react";

export function Logo({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizes = {
    sm: { icon: 20, text: "text-lg" },
    default: { icon: 28, text: "text-xl" },
    lg: { icon: 36, text: "text-2xl" },
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
          <Mic size={sizes[size].icon} className="text-primary-foreground" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-background flex items-center justify-center">
          <FileText size={8} className="text-success-foreground" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className={`font-semibold ${sizes[size].text} gradient-text`}>
          MoM AI
        </span>
        <span className="text-xs text-muted-foreground -mt-0.5">
          Meeting Minutes
        </span>
      </div>
    </div>
  );
}
