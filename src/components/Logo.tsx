import minutevaultLogo from "@/assets/minutevault-logo.png";

export function Logo({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizes = {
    sm: { height: 32 },
    default: { height: 44 },
    lg: { height: 60 },
  };

  return (
    <div className="flex items-center">
      <img 
        src={minutevaultLogo} 
        alt="MinuteVault - Secure Meeting Minutes" 
        style={{ height: sizes[size].height }}
        className="w-auto object-contain"
      />
    </div>
  );
}
