/**
 * Utility functions for formatting calendar dates and times for Google Calendar sync.
 */
export class CalendarUtils {
  /**
   * Formats date string and time string into ISO 8601 string (e.g. 2026-07-28T17:00:00+05:30)
   */
  public static toISOString(dateStr: string, timeStr: string, durationMinutes: number = 60): { start: string; end: string } {
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    let day = new Date().getDate();

    // Check relative keywords like "today", "tomorrow"
    const lowerDate = dateStr.toLowerCase().trim();
    if (lowerDate.includes('tomorrow') || lowerDate.includes('kal')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      year = tomorrow.getFullYear();
      month = tomorrow.getMonth() + 1;
      day = tomorrow.getDate();
    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = dateStr.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }

    // Parse time (e.g., "17:00", "5:00 PM", "5 PM")
    let hours = 17;
    let minutes = 0;

    const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
    }

    const pad = (num: number) => num.toString().padStart(2, '0');
    const formattedDate = `${year}-${pad(month)}-${pad(day)}`;
    const startTimeStr = `${formattedDate}T${pad(hours)}:${pad(minutes)}:00+05:30`;

    const endDate = new Date(year, month - 1, day, hours, minutes + durationMinutes);
    const endTimeStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00+05:30`;

    return {
      start: startTimeStr,
      end: endTimeStr
    };
  }
}
