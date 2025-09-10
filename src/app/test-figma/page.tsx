'use client';

import { useState } from 'react';

interface FigmaData {
  fileName: string;
  lastModified: string;
  version: string;
  frames: Array<{
    id: string;
    name: string;
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  components: Array<{
    id: string;
    name: string;
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  colors: string[];
  nodeCount: {
    total: number;
    frames: number;
    components: number;
  };
}

export default function TestFigmaPage() {
  const [accessToken, setAccessToken] = useState('');
  const [figmaData, setFigmaData] = useState<FigmaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultFileUrl = 'https://www.figma.com/design/JhEHbXkPEzi01zQUCLqqTC/Shrug-Working?t=KgmkeHGjRUAQH8S5-0';

  const fetchFigmaData = async () => {
    if (!accessToken.trim()) {
      setError('Please enter your Figma access token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/figma?fileUrl=${encodeURIComponent(defaultFileUrl)}&token=${encodeURIComponent(accessToken)}`);
      const result = await response.json();

      if (result.success) {
        setFigmaData(result.data);
      } else {
        setError(result.error || 'Failed to fetch Figma data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Figma Integration Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Get Data from Figma File</h2>
          <p className="text-gray-600 mb-4">
            File: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">Shrug-Working</span>
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                Figma Access Token
              </label>
              <input
                type="password"
                id="token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter your Figma personal access token"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your token from: Account Settings → Personal Access Tokens in Figma
              </p>
            </div>
            
            <button
              onClick={fetchFigmaData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              {loading ? 'Fetching...' : 'Fetch Figma Data'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        {figmaData && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">File Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">File Name</p>
                  <p className="text-gray-900">{figmaData.fileName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Version</p>
                  <p className="text-gray-900">{figmaData.version}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Modified</p>
                  <p className="text-gray-900">{new Date(figmaData.lastModified).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Node Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{figmaData.nodeCount.total}</p>
                  <p className="text-sm text-gray-600">Total Nodes</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{figmaData.nodeCount.frames}</p>
                  <p className="text-sm text-gray-600">Frames</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{figmaData.nodeCount.components}</p>
                  <p className="text-sm text-gray-600">Components</p>
                </div>
              </div>
            </div>

            {figmaData.colors.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Colors Found</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {figmaData.colors.slice(0, 24).map((color, index) => (
                    <div key={index} className="text-center">
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-gray-200 mx-auto mb-1"
                        style={{ backgroundColor: color }}
                      ></div>
                      <p className="text-xs font-mono text-gray-600">{color}</p>
                    </div>
                  ))}
                </div>
                {figmaData.colors.length > 24 && (
                  <p className="text-sm text-gray-500 mt-4">
                    Showing first 24 of {figmaData.colors.length} colors
                  </p>
                )}
              </div>
            )}

            {figmaData.frames.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Frames ({figmaData.frames.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {figmaData.frames.map((frame) => (
                    <div key={frame.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium text-gray-800">{frame.name}</span>
                      {frame.bounds && (
                        <span className="text-sm text-gray-500 font-mono">
                          {Math.round(frame.bounds.width)} × {Math.round(frame.bounds.height)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {figmaData.components.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Components ({figmaData.components.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {figmaData.components.map((component) => (
                    <div key={component.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium text-gray-800">{component.name}</span>
                      {component.bounds && (
                        <span className="text-sm text-gray-500 font-mono">
                          {Math.round(component.bounds.width)} × {Math.round(component.bounds.height)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}