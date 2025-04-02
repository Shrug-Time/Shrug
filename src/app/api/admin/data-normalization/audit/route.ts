import { NextRequest, NextResponse } from 'next/server';
import { auditUserIdFields } from '@/utils/dataNormalization';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collection = searchParams.get('collection') || 'posts';
    const batchSize = parseInt(searchParams.get('batchSize') || '100', 10);
    
    console.log(`[API] Running data audit on collection: ${collection}`);
    
    const auditResults = await auditUserIdFields(collection, batchSize);
    
    return NextResponse.json({
      success: true,
      collection,
      results: auditResults,
      summary: {
        totalDocuments: auditResults.total,
        inconsistentUserIdFields: (
          auditResults.userID + 
          auditResults.userid + 
          auditResults.user_id
        ),
        missingAnswerUserIds: (
          auditResults.hasAnswers - auditResults.answerUserIds
        )
      }
    });
  } catch (error) {
    console.error('Error in data audit API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
} 