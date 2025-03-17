import { NextRequest, NextResponse } from 'next/server';
import { normalizeUserIdFieldsInCollection } from '@/utils/dataNormalization';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { collection = 'posts', batchSize = 100, dryRun = true } = body;
    
    console.log(`[API] Running data normalization on collection: ${collection}`);
    console.log(`[API] Batch size: ${batchSize}, Dry run: ${dryRun}`);
    
    const normalizationResults = await normalizeUserIdFieldsInCollection(
      collection,
      batchSize,
      dryRun
    );
    
    return NextResponse.json({
      success: true,
      collection,
      dryRun,
      results: normalizationResults,
      message: dryRun 
        ? `Dry run completed. ${normalizationResults.updated} documents would be updated.`
        : `Normalization completed. ${normalizationResults.updated} documents were updated.`
    });
  } catch (error) {
    console.error('Error in data normalization API:', error);
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