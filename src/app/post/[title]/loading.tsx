import AccessingOverlay from '@/components/AccessingOverlay'

export default function Loading() {
  // Render fullscreen so position stays consistent with the click-handler
  // overlay (random/latest). Only the message changes — no panel jump.
  return <AccessingOverlay fullscreen message="ACCESSING LOG ENTRY" />
}
