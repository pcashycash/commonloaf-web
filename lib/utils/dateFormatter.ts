export function dayLabel(date: Date, referenceDate: Date = new Date()): string {
  const startOfThisWeek = new Date(referenceDate);
  startOfThisWeek.setDate(referenceDate.getDate() - referenceDate.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);
  
  const endOfThisWeek = new Date(startOfThisWeek);
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 7);
  
  const isThisWeek = date >= startOfThisWeek && date < endOfThisWeek;
  
  if (isThisWeek) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    return date.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
  }
}

export function timeLabel(date: Date): string {
  const uses24Hour = new Date().toLocaleTimeString("en-US", { hour12: false }).includes(":");
  const minute = date.getMinutes();
  
  if (uses24Hour) {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } else {
    if (minute === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).toLowerCase();
    } else {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
    }
  }
}

export function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

