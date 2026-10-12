import logoAsset from "@/assets/widelens-logo.jpg.asset.json";

export function Logo({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizes = {
    sm: "h-10 w-10",
    default: "h-12 w-12",
    lg: "h-36 w-36",
  };

  return (
    <div className="flex items-center justify-center shrink-0">
      <img 
        src={logoAsset.url}
        alt="WidelensPro Intelligence logo"
        className={`${sizes[size]} max-w-full object-contain`}
      />
    </div>
  );
}
