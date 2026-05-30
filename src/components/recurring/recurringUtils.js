import { addDays, addWeeks, addMonths, addYears, isWeekend, nextMonday, lastDayOfMonth, setDate, setMonth, isBefore, isAfter, startOfDay } from 'date-fns';

export function calculateNextOccurrence(template, fromDate = new Date()) {
  let nextDate = new Date(fromDate);

  switch (template.frequency) {
    case 'daily':
      nextDate = addDays(nextDate, 1);
      break;

    case 'weekly':
      nextDate = addWeeks(nextDate, 1);
      if (template.day_of_week !== undefined) {
        // Set to specific day of week
        const diff = template.day_of_week - nextDate.getDay();
        nextDate = addDays(nextDate, diff >= 0 ? diff : diff + 7);
      }
      break;

    case 'biweekly':
      nextDate = addDays(nextDate, 14);
      break;

    case 'monthly':
      nextDate = addMonths(nextDate, 1);
      if (template.day_of_month === -1) {
        nextDate = lastDayOfMonth(nextDate);
      } else if (template.day_of_month) {
        nextDate = setDate(nextDate, Math.min(template.day_of_month, lastDayOfMonth(nextDate).getDate()));
      }
      break;

    case 'quarterly':
      nextDate = addMonths(nextDate, 3);
      if (template.day_of_month === -1) {
        nextDate = lastDayOfMonth(nextDate);
      } else if (template.day_of_month) {
        nextDate = setDate(nextDate, Math.min(template.day_of_month, lastDayOfMonth(nextDate).getDate()));
      }
      break;

    case 'yearly':
      nextDate = addYears(nextDate, 1);
      if (template.month_of_year) {
        nextDate = setMonth(nextDate, template.month_of_year - 1);
      }
      if (template.day_of_month === -1) {
        nextDate = lastDayOfMonth(nextDate);
      } else if (template.day_of_month) {
        nextDate = setDate(nextDate, Math.min(template.day_of_month, lastDayOfMonth(nextDate).getDate()));
      }
      break;
  }

  // Skip weekends if configured
  if (template.skip_weekends && isWeekend(nextDate)) {
    nextDate = nextMonday(nextDate);
  }

  return startOfDay(nextDate);
}

export function shouldGenerateTransaction(template, today = new Date()) {
  if (!template.is_active) return false;
  if (!template.next_occurrence_date) return false;

  const nextOccurrence = new Date(template.next_occurrence_date);
  const todayStart = startOfDay(today);

  // Check if it's time to generate
  if (isAfter(nextOccurrence, todayStart)) return false;

  // Check if we've reached max occurrences
  if (template.max_occurrences && template.occurrences_generated >= template.max_occurrences) {
    return false;
  }

  // Check if we've passed end date
  if (template.end_date && isAfter(todayStart, new Date(template.end_date))) {
    return false;
  }

  return true;
}

export function getUpcomingOccurrences(template, count = 5) {
  const occurrences = [];
  let currentDate = template.next_occurrence_date 
    ? new Date(template.next_occurrence_date)
    : new Date(template.start_date);

  for (let i = 0; i < count; i++) {
    if (template.max_occurrences && occurrences.length >= template.max_occurrences - template.occurrences_generated) {
      break;
    }
    if (template.end_date && isAfter(currentDate, new Date(template.end_date))) {
      break;
    }

    occurrences.push(new Date(currentDate));
    currentDate = calculateNextOccurrence(template, currentDate);
  }

  return occurrences;
}
