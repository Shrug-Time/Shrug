import { db } from '@/firebase';
import { 
  runTransaction, 
  Transaction,
  DocumentReference 
} from 'firebase/firestore';

type TransactionCallback<T> = (transaction: Transaction) => Promise<T>;

/**
 * Service to handle database transactions safely
 */
export class TransactionService {
  /**
   * Execute a transaction with proper error handling and recovery
   * 
   * @param operationName Name of the operation for error reporting
   * @param callback Transaction callback function
   * @param maxRetries Maximum number of automatic retries on failure
   * @returns Result of the transaction
   */
  static async executeTransaction<T>(
    operationName: string,
    callback: TransactionCallback<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        return await runTransaction(db, callback);
      } catch (error: any) {
        lastError = error;
        
        // Check if error is transient and can be retried
        if (
          error?.code === 'failed-precondition' || 
          error?.code === 'aborted' ||
          error?.message?.includes('unavailable')
        ) {
          // Exponential backoff before retry
          const backoffTime = Math.min(1000 * (2 ** retryCount), 5000);
          console.warn(`Transaction for ${operationName} failed, retrying in ${backoffTime}ms (${retryCount + 1}/${maxRetries + 1})`);
          
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          retryCount++;
        } else {
          // Non-transient error, don't retry
          break;
        }
      }
    }
    
    // Max retries exceeded or non-transient error
    console.error(`Transaction for ${operationName} failed after ${retryCount} retries:`, lastError);
    throw new TransactionError(operationName, lastError?.message || 'Unknown error', lastError);
  }
  
  /**
   * Get document safely within a transaction with proper error handling
   * 
   * @param transaction The active transaction
   * @param docRef Document reference
   * @param operationName Name of the operation for error reporting
   * @returns Document data or null if not found
   */
  static async getDocumentSafe<T>(
    transaction: Transaction, 
    docRef: DocumentReference,
    operationName: string
  ): Promise<T | null> {
    try {
      const doc = await transaction.get(docRef);
      return doc.exists() ? (doc.data() as T) : null;
    } catch (error) {
      console.error(`Failed to get document in ${operationName} transaction:`, error);
      throw new TransactionError(operationName, 'Failed to get document', error as Error);
    }
  }
  
  /**
   * Convert user-friendly error message to display message
   * 
   * @param error Error object
   * @returns User-friendly error message
   */
  static getUserFriendlyErrorMessage(error: any): string {
    if (error instanceof TransactionError) {
      return error.userMessage;
    }
    
    // Check for common Firebase errors
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
        case 'failed-precondition':
          return 'The operation couldn\'t be completed. Please try again.';
        default:
          return 'An error occurred. Please try again later.';
      }
    }
    
    return error?.message || 'An unexpected error occurred. Please try again later.';
  }
}

/**
 * Custom error class for transaction failures
 */
export class TransactionError extends Error {
  operationName: string;
  originalError: Error | null;
  userMessage: string;
  
  constructor(
    operationName: string, 
    message: string, 
    originalError: Error | null = null
  ) {
    super(message);
    this.name = 'TransactionError';
    this.operationName = operationName;
    this.originalError = originalError;
    
    // Create a user-friendly message
    this.userMessage = this.createUserMessage();
  }
  
  private createUserMessage(): string {
    // Map technical errors to user-friendly messages
    const commonErrors: Record<string, string> = {
      'permission-denied': 'You don\'t have permission to perform this action.',
      'not-found': 'The requested item could not be found.',
      'resource-exhausted': 'The system is currently busy. Please try again later.',
      'unavailable': 'The service is temporarily unavailable. Please try again later.',
      'aborted': 'The operation was interrupted. Please try again.',
      'failed-precondition': 'The operation couldn\'t be completed. Please try again.'
    };
    
    const errorCode = this.originalError?.['code'];
    if (errorCode && commonErrors[errorCode]) {
      return commonErrors[errorCode];
    }
    
    // Default user messages by operation type
    const operationMessages: Record<string, string> = {
      'create': 'Failed to create the item. Please try again.',
      'update': 'Failed to update the item. Please try again.',
      'delete': 'Failed to delete the item. Please try again.',
      'read': 'Failed to load the requested information. Please try again.',
      'like': 'Failed to register your like. Please try again.',
      'unlike': 'Failed to remove your like. Please try again.',
      'vote': 'Failed to register your vote. Please try again.',
      'submit': 'Failed to submit your information. Please try again.'
    };
    
    // Look for operation keywords in the operation name
    for (const [keyword, message] of Object.entries(operationMessages)) {
      if (this.operationName.toLowerCase().includes(keyword.toLowerCase())) {
        return message;
      }
    }
    
    // Fallback generic message
    return 'An error occurred. Please try again later.';
  }
} 