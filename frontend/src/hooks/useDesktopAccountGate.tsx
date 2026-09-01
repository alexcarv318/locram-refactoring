import { useDesktopActivationController } from "@/hooks/useDesktopActivationController";

export function useDesktopAccountGate() {
  const controller = useDesktopActivationController();
  return {
    ...controller,
    signInMutation: controller.activationMutation,
  };
}
