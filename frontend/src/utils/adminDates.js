const MS_PER_DAY = 24 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function todayISO() {
  return toISODate(new Date());
}

export function toISODate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(value) {
  if (!value || typeof value !== "string") return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function addDays(value, amount) {
  const date = typeof value === "string" ? parseISODate(value) : new Date(value);
  if (!date) return "";
  date.setDate(date.getDate() + Number(amount || 0));
  return toISODate(date);
}

export function formatDate(value) {
  const date = parseISODate(value);
  if (!date) return "—";
  return dateFormatter.format(date);
}

export function inclusiveDays(from, to) {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (!start || !end || end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

export function daysFromToday(value) {
  const date = parseISODate(value);
  const today = parseISODate(todayISO());
  if (!date || !today) return null;
  return Math.round((date.getTime() - today.getTime()) / MS_PER_DAY);
}

export function relativeExamLabel(value) {
  const diff = daysFromToday(value);
  if (diff === null) return "";
  if (diff < 0) return "Past";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff <= 14) return `In ${diff} days`;
  return "";
}

export function rangeSubtitle(from, to) {
  if (!from || !to) return "Choose a date range";
  if (from === to) return formatDate(from);
  return `${formatDate(from)} – ${formatDate(to)}`;
}
