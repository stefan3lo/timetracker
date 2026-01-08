export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return [hours, minutes, secs]
    .map((unit) => unit.toString().padStart(2, "0"))
    .join(":");
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function getISODate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getMonthGrid(date: Date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const startWeekday = (start.getDay() + 6) % 7;
  const daysInMonth = end.getDate();
  const grid: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  for (let i = 0; i < startWeekday; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() - (startWeekday - i));
    grid.push({ date: d, isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    grid.push({ date: new Date(date.getFullYear(), date.getMonth(), day), isCurrentMonth: true });
  }

  while (grid.length % 7 !== 0) {
    const last = grid[grid.length - 1].date;
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    grid.push({ date: next, isCurrentMonth: false });
  }

  return grid;
}
