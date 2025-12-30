import { useCallback } from "react";

type HapticPattern = "light" | "medium" | "heavy" | "success" | "error";

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  error: [50, 30, 50],
};

export function useHapticFeedback() {
  const vibrate = useCallback((pattern: HapticPattern = "light") => {
    if (!("vibrate" in navigator)) return;
    
    try {
      navigator.vibrate(patterns[pattern]);
    } catch (error) {
      // Vibration API not supported or failed
      console.debug("Haptic feedback not available");
    }
  }, []);

  const lightTap = useCallback(() => vibrate("light"), [vibrate]);
  const mediumTap = useCallback(() => vibrate("medium"), [vibrate]);
  const heavyTap = useCallback(() => vibrate("heavy"), [vibrate]);
  const successFeedback = useCallback(() => vibrate("success"), [vibrate]);
  const errorFeedback = useCallback(() => vibrate("error"), [vibrate]);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    successFeedback,
    errorFeedback,
  };
}
