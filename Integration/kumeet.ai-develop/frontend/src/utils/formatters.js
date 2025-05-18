/**
 * Format date to display format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
    const d = new Date(date);
    const options = { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };
  
  /**
   * Format time to display format
   * @param {string} time - Time to format (HH:MM format)
   * @returns {string} Formatted time string (e.g., "3:00 PM")
   */
  export const formatTime = (time) => {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  /**
   * Format duration in minutes to display format
   * @param {number} minutes - Duration in minutes
   * @returns {string} Formatted duration string (e.g., "1h 30m")
   */
  export const formatDuration = (minutes) => {
    if (typeof minutes !== 'number' || isNaN(minutes)) return '';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };
  
  /**
   * Truncate text with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  export const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };