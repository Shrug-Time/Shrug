/**
 * THIS MIGRATION API ROUTE IS NO LONGER NEEDED
 * 
 * Since the database has been cleared, there's no legacy data to migrate.
 * Keeping this file for reference only.
 */

import { NextRequest, NextResponse } from 'next/server';

// Admin-only API endpoint to run migrations
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      message: 'Migrations are no longer needed with a fresh database',
      status: 'disabled'
    }, 
    { status: 200 }
  );
} 