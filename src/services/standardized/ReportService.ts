import { db } from '@/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  Timestamp,
  increment,
  getDoc
} from 'firebase/firestore';
import { handleServiceError } from '@/utils/serviceHelpers';

// Content types that can be reported
export type ReportableContentType = 'post' | 'answer';

// Report status options
export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed';

// Report reason categories
export type ReportReason = 
  | 'harassment_bullying' 
  | 'threatening_content'
  | 'hate_speech'
  | 'explicit_content'
  | 'spam_scam'
  | 'impersonation'
  | 'other';

// Report data structure
export interface Report {
  id: string;
  contentType: ReportableContentType;
  contentId: string;
  parentId?: string; // For answers, this is the post ID
  reporterId: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  createdAt: number;
  updatedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNotes?: string;
  actionTaken?: string;
}

/**
 * Service for managing content reports
 */
export class ReportService {
  private static readonly REPORTS_COLLECTION = 'reports';
  private static readonly REPORT_RATE_LIMIT = 5; // Maximum reports per user per day

  /**
   * Create a new content report
   * @param contentType Type of content being reported
   * @param contentId ID of the content being reported
   * @param reporterId ID of the user making the report
   * @param reason Reason for the report
   * @param description Optional additional details
   * @param parentId Optional parent ID (post ID for answers)
   * @returns The created report
   */
  static async createReport(
    contentType: ReportableContentType,
    contentId: string,
    reporterId: string,
    reason: ReportReason,
    description?: string,
    parentId?: string
  ): Promise<Report> {
    try {
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Check rate limiting
      if (await this.isUserRateLimited(reporterId)) {
        throw new Error('You have reached the maximum number of reports for today');
      }

      const reportsRef = collection(db, this.REPORTS_COLLECTION);
      const reportDoc = doc(reportsRef);
      const now = Date.now();
      
      const report: Report = {
        id: reportDoc.id,
        contentType,
        contentId,
        parentId,
        reporterId,
        reason,
        description,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      };
      
      await setDoc(reportDoc, report);
      
      // Track this in user stats for rate limiting
      await this.incrementUserReportCount(reporterId);
      
      return report;
    } catch (error) {
      return handleServiceError('create report', error);
    }
  }

  /**
   * Get reports for admin review, with optional filtering
   * @param status Filter by report status
   * @param contentType Filter by content type
   * @param maxResults Maximum number of results to return
   * @returns Array of report objects
   */
  static async getReports(
    status?: ReportStatus,
    contentType?: ReportableContentType,
    maxResults: number = 50
  ): Promise<Report[]> {
    try {
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      const reportsRef = collection(db, this.REPORTS_COLLECTION);
      
      // Build query constraints
      const constraints = [];
      
      if (status) {
        constraints.push(where('status', '==', status));
      }
      
      if (contentType) {
        constraints.push(where('contentType', '==', contentType));
      }
      
      // Always order by creation date, newest first
      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(maxResults));
      
      const reportsQuery = query(reportsRef, ...constraints);
      const querySnapshot = await getDocs(reportsQuery);
      
      const reports: Report[] = [];
      querySnapshot.forEach(doc => {
        reports.push(doc.data() as Report);
      });
      
      return reports;
    } catch (error) {
      return handleServiceError('get reports', error);
    }
  }

  /**
   * Update the status of a report
   * @param reportId ID of the report to update
   * @param status New status
   * @param reviewerId ID of the admin reviewing the report
   * @param notes Optional notes from the reviewer
   * @param actionTaken Description of action taken, if any
   * @returns Success status
   */
  static async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    reviewerId: string,
    notes?: string,
    actionTaken?: string
  ): Promise<boolean> {
    try {
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      const reportRef = doc(db, this.REPORTS_COLLECTION, reportId);
      const now = Date.now();
      
      const updateData: any = {
        status,
        updatedAt: now,
        reviewedAt: now,
        reviewedBy: reviewerId
      };
      
      if (notes) {
        updateData.reviewNotes = notes;
      }
      
      if (actionTaken) {
        updateData.actionTaken = actionTaken;
      }
      
      await updateDoc(reportRef, updateData);
      
      return true;
    } catch (error) {
      handleServiceError('update report status', error);
      return false;
    }
  }

  /**
   * Check if a user has submitted too many reports today
   * @param userId ID of the user to check
   * @returns Whether the user is rate limited
   */
  private static async isUserRateLimited(userId: string): Promise<boolean> {
    try {
      if (!db) {
        return false; // Default to not rate limited if db is not available
      }
      
      // Calculate today's date (start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get user's reports from today
      const reportsRef = collection(db, this.REPORTS_COLLECTION);
      const reportsQuery = query(
        reportsRef,
        where('reporterId', '==', userId),
        where('createdAt', '>=', today.getTime())
      );
      
      const querySnapshot = await getDocs(reportsQuery);
      
      // Check if user has reached rate limit
      return querySnapshot.size >= this.REPORT_RATE_LIMIT;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Default to not rate limited in case of error
      return false;
    }
  }

  /**
   * Increment the user's report count for rate limiting
   * @param userId ID of the user
   */
  private static async incrementUserReportCount(userId: string): Promise<void> {
    try {
      // This would typically update a user stats document
      // For now, we're just using the reports query for rate limiting
      // But in a production system, you might track this in a separate collection
      // for performance reasons
    } catch (error) {
      console.error('Error incrementing report count:', error);
    }
  }

  /**
   * Remove reported content from the database
   * @param contentType Type of content to remove
   * @param contentId ID of the content to remove
   * @param parentId Optional parent ID for answers
   * @returns Success status
   */
  static async removeReportedContent(
    contentType: ReportableContentType,
    contentId: string,
    parentId?: string
  ): Promise<boolean> {
    try {
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      if (contentType === 'post') {
        // Remove post
        const postRef = doc(db, 'posts', contentId);
        await updateDoc(postRef, {
          isDeleted: true,
          deletedAt: Date.now(),
          deletedReason: 'Removed due to content policy violation'
        });
        return true;
      } else if (contentType === 'answer' && parentId) {
        // Remove answer from post
        const postRef = doc(db, 'posts', parentId);
        
        // Get post data
        const postSnapshot = await getDoc(postRef);
        if (!postSnapshot.exists()) {
          throw new Error('Post not found');
        }
        
        const postData = postSnapshot.data();
        const answers = postData.answers || [];
        
        // Filter out the deleted answer
        const updatedAnswers = answers.filter((answer: any) => answer.id !== contentId);
        
        // Update the post with the filtered answers
        await updateDoc(postRef, { 
          answers: updatedAnswers,
          updatedAt: Date.now()
        });
        
        return true;
      } else if (contentType === 'answer') {
        // Without parent ID, we need to search for the post containing this answer
        console.error('Cannot remove answer without parent post ID');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error removing reported content:', error);
      return false;
    }
  }
} 