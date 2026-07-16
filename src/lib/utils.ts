export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    dateStyle: "medium",
  });
}

export function formatTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("en-US", {
    timeStyle: "short",
  });
}

export function isOverdue(deadline: string | null, status: string) {
  if (!deadline || status === "done") return false;
  return new Date(deadline).getTime() < Date.now();
}
