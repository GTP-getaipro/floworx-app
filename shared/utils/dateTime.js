/**
 * Date and Time Utilities for FloWorx SaaS
 * Comprehensive date/time handling with timezone support
 */

/**
 * Date formatting options
 */
const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY at HH:mm',
  RELATIVE: 'relative',
  TIMESTAMP: 'timestamp'
};

/**
 * Timezone constants
 */
const TIMEZONES = {
  UTC: 'UTC',
  EST: 'America/New_York',
  PST: 'America/Los_Angeles',
  CST: 'America/Chicago',
  MST: 'America/Denver'
};

/**
 * Format date to specified format
 */
const formatDate = (date, format = DATE_FORMATS.DISPLAY, timezone = null) => {
  if (!date) return null;
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return null;

  // Handle timezone conversion
  let workingDate = dateObj;
  if (timezone && timezone !== 'UTC') {
    try {
      workingDate = new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
    } catch (error) {
      console.warn(`Invalid timezone: ${timezone}, using UTC`);
    }
  }

  switch (format) {
    case DATE_FORMATS.ISO:
      return workingDate.toISOString();
      
    case DATE_FORMATS.DATE_ONLY:
      return workingDate.toISOString().split('T')[0];
      
    case DATE_FORMATS.TIME_ONLY:
      return workingDate.toTimeString().split(' ')[0];
      
    case DATE_FORMATS.DATETIME:
      return workingDate.toISOString().replace('T', ' ').split('.')[0];
      
    case DATE_FORMATS.DISPLAY:
      return workingDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
    case DATE_FORMATS.DISPLAY_WITH_TIME:
      return workingDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
    case DATE_FORMATS.RELATIVE:
      return getRelativeTime(workingDate);
      
    case DATE_FORMATS.TIMESTAMP:
      return workingDate.getTime();
      
    default:
      return workingDate.toISOString();
  }
};

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
const getRelativeTime = (date) => {
  if (!date) return null;
  
  const now = new Date();
  const dateObj = new Date(date);
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const future = diffMs < 0;
  const abs = Math.abs;

  if (abs(diffSeconds) < 60) {
    return future ? 'in a few seconds' : 'just now';
  } else if (abs(diffMinutes) < 60) {
    const minutes = abs(diffMinutes);
    return future 
      ? `in ${minutes} minute${minutes !== 1 ? 's' : ''}`
      : `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (abs(diffHours) < 24) {
    const hours = abs(diffHours);
    return future
      ? `in ${hours} hour${hours !== 1 ? 's' : ''}`
      : `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (abs(diffDays) < 7) {
    const days = abs(diffDays);
    return future
      ? `in ${days} day${days !== 1 ? 's' : ''}`
      : `${days} day${days !== 1 ? 's' : ''} ago`;
  } else if (abs(diffWeeks) < 4) {
    const weeks = abs(diffWeeks);
    return future
      ? `in ${weeks} week${weeks !== 1 ? 's' : ''}`
      : `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (abs(diffMonths) < 12) {
    const months = abs(diffMonths);
    return future
      ? `in ${months} month${months !== 1 ? 's' : ''}`
      : `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    const years = abs(diffYears);
    return future
      ? `in ${years} year${years !== 1 ? 's' : ''}`
      : `${years} year${years !== 1 ? 's' : ''} ago`;
  }
};

/**
 * Parse date from various formats
 */
const parseDate = (dateInput) => {
  if (!dateInput) return null;
  
  // Already a Date object
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  
  // Timestamp (number)
  if (typeof dateInput === 'number') {
    return new Date(dateInput);
  }
  
  // String parsing
  if (typeof dateInput === 'string') {
    // ISO format
    if (dateInput.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return new Date(dateInput);
    }
    
    // Date only format
    if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateInput + 'T00:00:00.000Z');
    }
    
    // Try general parsing
    const parsed = new Date(dateInput);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
};

/**
 * Check if date is valid
 */
const isValidDate = (date) => {
  const parsed = parseDate(date);
  return parsed !== null && !isNaN(parsed.getTime());
};

/**
 * Get date range (start and end of day/week/month/year)
 */
const getDateRange = (date, period = 'day', timezone = 'UTC') => {
  const dateObj = parseDate(date);
  if (!dateObj) return null;

  let start, end;

  switch (period) {
    case 'day':
      start = new Date(dateObj);
      start.setHours(0, 0, 0, 0);
      end = new Date(dateObj);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'week':
      start = new Date(dateObj);
      start.setDate(dateObj.getDate() - dateObj.getDay());
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'month':
      start = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      end = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
      
    case 'year':
      start = new Date(dateObj.getFullYear(), 0, 1);
      end = new Date(dateObj.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
      
    default:
      return null;
  }

  return {
    start: formatDate(start, DATE_FORMATS.ISO, timezone),
    end: formatDate(end, DATE_FORMATS.ISO, timezone)
  };
};

/**
 * Add time to date
 */
const addTime = (date, amount, unit = 'days') => {
  const dateObj = parseDate(date);
  if (!dateObj) return null;

  const result = new Date(dateObj);
  
  switch (unit) {
    case 'milliseconds':
      result.setMilliseconds(result.getMilliseconds() + amount);
      break;
    case 'seconds':
      result.setSeconds(result.getSeconds() + amount);
      break;
    case 'minutes':
      result.setMinutes(result.getMinutes() + amount);
      break;
    case 'hours':
      result.setHours(result.getHours() + amount);
      break;
    case 'days':
      result.setDate(result.getDate() + amount);
      break;
    case 'weeks':
      result.setDate(result.getDate() + (amount * 7));
      break;
    case 'months':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'years':
      result.setFullYear(result.getFullYear() + amount);
      break;
    default:
      return null;
  }
  
  return result;
};

/**
 * Get time difference between two dates
 */
const getTimeDifference = (date1, date2, unit = 'milliseconds') => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2) return null;
  
  const diffMs = d2.getTime() - d1.getTime();
  
  switch (unit) {
    case 'milliseconds':
      return diffMs;
    case 'seconds':
      return Math.floor(diffMs / 1000);
    case 'minutes':
      return Math.floor(diffMs / (1000 * 60));
    case 'hours':
      return Math.floor(diffMs / (1000 * 60 * 60));
    case 'days':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    case 'weeks':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    default:
      return diffMs;
  }
};

/**
 * Check if date is in range
 */
const isDateInRange = (date, startDate, endDate) => {
  const d = parseDate(date);
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (!d || !start || !end) return false;
  
  return d >= start && d <= end;
};

/**
 * Get business days between dates (excluding weekends)
 */
const getBusinessDays = (startDate, endDate) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (!start || !end) return 0;
  
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

module.exports = {
  // Constants
  DATE_FORMATS,
  TIMEZONES,
  
  // Core functions
  formatDate,
  parseDate,
  isValidDate,
  getRelativeTime,
  getDateRange,
  addTime,
  getTimeDifference,
  isDateInRange,
  getBusinessDays
};
