import { NextRequest, NextResponse } from 'next/server';
import { createFigmaService } from '@/services/figmaService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('fileUrl');
    const accessToken = searchParams.get('token');

    if (!fileUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: fileUrl and token' },
        { status: 400 }
      );
    }

    const figmaService = createFigmaService(accessToken);
    const fileKey = figmaService.extractFileKey(fileUrl);
    
    const fileData = await figmaService.getFile(fileKey);
    
    const frames = figmaService.findNodesByType(fileData.document, 'FRAME');
    const components = figmaService.findNodesByType(fileData.document, 'COMPONENT');
    const colors = figmaService.extractColors(fileData.document);

    return NextResponse.json({
      success: true,
      data: {
        fileName: fileData.name,
        lastModified: fileData.lastModified,
        version: fileData.version,
        frames: frames.map(frame => ({
          id: frame.id,
          name: frame.name,
          bounds: frame.absoluteBoundingBox
        })),
        components: components.map(comp => ({
          id: comp.id,
          name: comp.name,
          bounds: comp.absoluteBoundingBox
        })),
        colors: colors,
        nodeCount: {
          total: countNodes(fileData.document),
          frames: frames.length,
          components: components.length
        }
      }
    });

  } catch (error) {
    console.error('Figma API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Figma data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function countNodes(node: any): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}