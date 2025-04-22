import { TransactionError } from './TransactionService';

/**
 * Service for consistent error handling across the application
 */
export class ErrorHandlingService {
  /**
   * Log error to console with context information
   * 
   * @param context Operation context for the error
   * @param error Error object
   * @param additionalInfo Additional context information
   */
  static logError(context: string, error: any, additionalInfo: Record<string, any> = {}): void {
    // Standardize error message format with timestamp
    const timestamp = new Date().toISOString();
    const errorType = error?.name || 'UnknownError';
    const errorCode = error?.code || 'none';
    const errorMessage = error?.message || 'Unknown error occurred';
    
    // Create structured error data
    const errorData = {
      timestamp,
      context,
      errorType,
      errorCode,
      errorMessage,
      stack: error?.stack,
      ...additionalInfo
    };
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.group(`⚠️ Error in ${context} [${timestamp}]`);
      console.error(errorMessage);
      console.error('Error details:', errorData);
      console.groupEnd();
    } else {
      // In production, use a more compact format
      console.error(`[${timestamp}] [${context}] [${errorType}] ${errorMessage}`);
      
      // TODO: In the future, we could integrate with a proper error tracking service
      // like Sentry, LogRocket, or Firebase Crashlytics
    }
  }
  
  /**
   * Handle service errors consistently
   * 
   * @param operationName Name of the operation for error context
   * @param error Error object
   * @param defaultValue Optional default value to return on error
   * @returns Default value if provided, otherwise re-throws the error
   */
  static handleServiceError<T>(operationName: string, error: any, defaultValue?: T): T {
    this.logError(operationName, error);
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    // Convert to a standard error format
    if (error instanceof TransactionError) {
      throw error; // Already formatted appropriately
    } else {
      throw new Error(`Error in ${operationName}: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get user-friendly error message
   * 
   * @param error Error object
   * @returns User-friendly error message
   */
  static getUserFriendlyMessage(error: any): string {
    if (error instanceof TransactionError) {
      return error.userMessage;
    }
    
    // Generic error messages for common Firebase error codes
    const errorCode = error?.code;
    if (errorCode) {
      switch (errorCode) {
        case 'permission-denied':
          return 'You don\'t have permission to perform this action.';
        case 'not-found':
          return 'The requested item could not be found.';
        case 'resource-exhausted':
          return 'The system is currently busy. Please try again later.';
        case 'unavailable':
          return 'The service is temporarily unavailable. Please try again later.';
        case 'unauthenticated':
          return 'You need to be signed in to perform this action.';
        case 'invalid-argument':
          return 'There was a problem with the information provided.';
        default:
          return 'An error occurred. Please try again later.';
      }
    }
    
    return error?.message || 'An unexpected error occurred. Please try again later.';
  }
  
  /**
   * Wrap async functions with standard error handling
   * 
   * @param fn Async function to wrap
   * @param operationName Name of the operation for error context
   * @param defaultValue Optional default value to return on error
   * @returns Wrapped function with error handling
   */
  static wrapAsync<T, Args extends any[]>(
    fn: (...args: Args) => Promise<T>,
    operationName: string,
    defaultValue?: T
  ): (...args: Args) => Promise<T> {
    return async (...args: Args) => {
      try {
        return await fn(...args);
      } catch (error) {
        return this.handleServiceError(operationName, error, defaultValue);
      }
    };
  }
} 