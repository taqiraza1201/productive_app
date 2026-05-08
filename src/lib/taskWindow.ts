/**
 * Task creation is allowed between 22:00 (10 PM) and 00:00 (midnight).
 * Returns true if current hour is in [22, 23].
 */
export function isTaskCreationAllowed(): boolean {
  const hour = new Date().getHours();
  return hour >= 22;
}

export function getTaskWindowMessage(): string {
  return "Tasks can only be created between 10:00 PM and 12:00 AM.";
}
