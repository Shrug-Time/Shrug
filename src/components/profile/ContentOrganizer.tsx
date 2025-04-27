"use client";

import { useState } from 'react';
import { Post } from '@/types/models';

interface ContentOrganizerProps {
  content: Post[];
  onCancel: () => void;
  onSave: (orderedContent: Post[]) => void;
  organizationType: 'series' | 'custom';
}

export const ContentOrganizer = ({
  content,
  onCancel,
  onSave,
  organizationType
}: ContentOrganizerProps) => {
  const [orderedContent, setOrderedContent] = useState<Post[]>([...content]);
  
  // Move an item up in the list
  const moveUp = (index: number) => {
    if (index === 0) return;
    
    const newOrderedContent = [...orderedContent];
    const temp = newOrderedContent[index];
    newOrderedContent[index] = newOrderedContent[index - 1];
    newOrderedContent[index - 1] = temp;
    
    setOrderedContent(newOrderedContent);
  };
  
  // Move an item down in the list
  const moveDown = (index: number) => {
    if (index === orderedContent.length - 1) return;
    
    const newOrderedContent = [...orderedContent];
    const temp = newOrderedContent[index];
    newOrderedContent[index] = newOrderedContent[index + 1];
    newOrderedContent[index + 1] = temp;
    
    setOrderedContent(newOrderedContent);
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">
          {organizationType === 'series' ? 'Arrange Series Order' : 'Review Selected Content'}
        </h2>
        <p className="text-gray-600 text-sm">
          {organizationType === 'series' 
            ? 'Arrange the items in the order you want them to appear in your series' 
            : 'Review your selected content (order will be preserved as shown)'}
        </p>
      </div>
      
      <div className="p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
        {orderedContent.length > 0 ? (
          <div className="space-y-3">
            {orderedContent.map((item, index) => {
              // Use the question property as the title
              const title = item.question || 'Untitled Answer';
              
              return (
                <div 
                  key={item.id}
                  className="p-4 rounded-lg border border-gray-200 bg-white"
                >
                  <div className="flex items-start">
                    {/* Number indicator for series */}
                    {organizationType === 'series' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-3">
                        {index + 1}
                      </div>
                    )}
                    
                    <div className="flex-grow">
                      <h4 className="font-medium">{title}</h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {item.answers?.[0]?.text ? item.answers[0].text.slice(0, 150) + '...' : 'No answer text available'}
                      </p>
                    </div>
                    
                    {/* Up/Down buttons for series */}
                    {organizationType === 'series' && (
                      <div className="flex flex-col space-y-1 ml-3">
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className={`p-1 rounded ${
                            index === 0 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === orderedContent.length - 1}
                          className={`p-1 rounded ${
                            index === orderedContent.length - 1
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            <p>No content selected</p>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
        >
          Back
        </button>
        <button
          onClick={() => onSave(orderedContent)}
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
        >
          Save Section
        </button>
      </div>
    </div>
  );
}; 