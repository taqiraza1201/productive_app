/**
 * Task creation is allowed between 22:00 (10 PM) and 23:59.
 */
export function isTaskCreationAllowed(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 && hour <= 23;
}

export function getTaskWindowMessage(): string {
  return "Tasks can only be created between 10:00 PM and 12:00 AM.";
}
