import { Timestamp } from 'firebase/firestore';

/**
 * Safely converts various date formats to a Date object
 */
export function toDate(dateField: any): Date {
  if (!dateField) return new Date();
  
  if (dateField instanceof Date) return dateField;
  
  if (typeof dateField === 'object' && 'toDate' in dateField && typeof dateField.toDate === 'function') {
    return dateField.toDate();
  }
  
  if (typeof dateField === 'string') return new Date(dateField);
  
  if (typeof dateField === 'number') return new Date(dateField);
  
  return new Date();
}

export default { toDate }; 