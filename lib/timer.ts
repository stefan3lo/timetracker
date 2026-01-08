export function calculateDurationSec({
  accumulatedSec,
  lastStateChange,
  isRunning,
  now = new Date(),
}: {
  accumulatedSec: number;
  lastStateChange: string | null;
  isRunning: boolean;
  now?: Date;
}) {
  if (!isRunning || !lastStateChange) return accumulatedSec;
  const last = new Date(lastStateChange);
  const delta = Math.max(0, Math.floor((now.getTime() - last.getTime()) / 1000));
  return accumulatedSec + delta;
}
