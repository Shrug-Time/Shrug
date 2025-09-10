interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: Array<{
    type: string;
    color?: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
  }>;
  strokes?: Array<{
    type: string;
    color?: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
  }>;
}

interface FigmaFileResponse {
  document: FigmaNode;
  components: Record<string, any>;
  componentSets: Record<string, any>;
  schemaVersion: number;
  styles: Record<string, any>;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  role: string;
  editorType: string;
  linkAccess: string;
}

export class FigmaService {
  private static readonly BASE_URL = 'https://api.figma.com/v1';
  private readonly accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const response = await fetch(`${FigmaService.BASE_URL}${endpoint}`, {
      headers: {
        'X-Figma-Token': this.accessToken,
      },
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorBody = await response.text();
        errorDetails = errorBody;
      } catch (e) {
        // ignore
      }
      throw new Error(`Figma API error: ${response.status} ${response.statusText}. Details: ${errorDetails}`);
    }

    return response.json();
  }

  async getFile(fileKey: string): Promise<FigmaFileResponse> {
    return this.makeRequest(`/files/${fileKey}`);
  }

  async getFileImages(fileKey: string, nodeIds: string[], format: 'jpg' | 'png' | 'svg' | 'pdf' = 'png'): Promise<{ images: Record<string, string> }> {
    const nodeIdsParam = nodeIds.join(',');
    return this.makeRequest(`/images/${fileKey}?ids=${nodeIdsParam}&format=${format}`);
  }

  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<{ nodes: Record<string, FigmaNode> }> {
    const nodeIdsParam = nodeIds.join(',');
    return this.makeRequest(`/files/${fileKey}/nodes?ids=${nodeIdsParam}`);
  }

  extractFileKey(figmaUrl: string): string {
    const match = figmaUrl.match(/\/design\/([a-zA-Z0-9]+)/);
    if (!match) {
      throw new Error('Invalid Figma URL format');
    }
    return match[1];
  }

  findNodesByType(node: FigmaNode, type: string): FigmaNode[] {
    const results: FigmaNode[] = [];
    
    if (node.type === type) {
      results.push(node);
    }
    
    if (node.children) {
      for (const child of node.children) {
        results.push(...this.findNodesByType(child, type));
      }
    }
    
    return results;
  }

  findNodesByName(node: FigmaNode, name: string): FigmaNode[] {
    const results: FigmaNode[] = [];
    
    if (node.name.toLowerCase().includes(name.toLowerCase())) {
      results.push(node);
    }
    
    if (node.children) {
      for (const child of node.children) {
        results.push(...this.findNodesByName(child, name));
      }
    }
    
    return results;
  }

  extractColors(node: FigmaNode): string[] {
    const colors: string[] = [];
    
    const extractFromFills = (fills: any[]) => {
      fills?.forEach(fill => {
        if (fill.type === 'SOLID' && fill.color) {
          const { r, g, b, a } = fill.color;
          const hex = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
          colors.push(a < 1 ? `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}` : hex);
        }
      });
    };

    extractFromFills(node.fills || []);
    extractFromFills(node.strokes || []);
    
    if (node.children) {
      for (const child of node.children) {
        colors.push(...this.extractColors(child));
      }
    }
    
    return [...new Set(colors)];
  }
}

export const createFigmaService = (accessToken: string) => {
  return new FigmaService(accessToken);
};