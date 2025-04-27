import { useState, useEffect } from 'react';
import { ProfileSection, Post } from '@/types/models';
import { ProfileSectionService } from '@/services/profileSectionService';
import { PostService } from '@/services/standardized';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Toast } from '@/components/common/Toast';

interface SectionManagerProps {
  userId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function SectionManager({ userId, onSave, onCancel }: SectionManagerProps) {
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState<string>('');
  const [editingSection, setEditingSection] = useState<ProfileSection | null>(null);
  const [availablePosts, setAvailablePosts] = useState<Post[]>([]);
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  const [isAddingContent, setIsAddingContent] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<ProfileSection | null>(null);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(false);
  
  // Load sections on component mount
  useEffect(() => {
    loadSections();
    loadUserContent();
  }, []);
  
  const loadSections = async () => {
    try {
      setIsLoading(true);
      const userSections = await ProfileSectionService.getSections(userId);
      setSections(userSections);
    } catch (error) {
      console.error('Error loading sections:', error);
      setError('Failed to load sections. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadUserContent = async () => {
    try {
      setIsLoadingPosts(true);
      const postResult = await PostService.getUserPosts(userId, 50);
      const answerResult = await PostService.getUserAnswers(userId, 50);
      
      // Combine posts and answers
      const combinedPosts = [
        ...(postResult.posts || []),
        ...(answerResult.posts || [])
      ];
      
      // Remove duplicates
      const uniquePostIds = new Set<string>();
      const uniquePosts = combinedPosts.filter(post => {
        if (uniquePostIds.has(post.id)) return false;
        uniquePostIds.add(post.id);
        return true;
      });
      
      setAvailablePosts(uniquePosts);
    } catch (error) {
      console.error('Error loading user content:', error);
      setToast({
        message: 'Failed to load your content',
        type: 'error'
      });
    } finally {
      setIsLoadingPosts(false);
    }
  };
  
  const handleCreateSection = async () => {
    if (!newSectionTitle.trim()) {
      setToast({
        message: 'Please enter a section title',
        type: 'error'
      });
      return;
    }
    
    try {
      const newSection = await ProfileSectionService.createSection(userId, {
        title: newSectionTitle,
        type: 'custom',
        organizationMethod: 'chronological',
        contentIds: [],
        position: sections.length,
        isVisible: true
      });
      
      setSections([...sections, newSection]);
      setNewSectionTitle('');
      setToast({
        message: 'Section created successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error creating section:', error);
      setToast({
        message: 'Failed to create section',
        type: 'error'
      });
    }
  };
  
  const handleUpdateSection = async (sectionId: string, updates: Partial<ProfileSection>) => {
    try {
      const updatedSection = await ProfileSectionService.updateSection(userId, sectionId, updates);
      
      setSections(sections.map(section => 
        section.id === sectionId ? updatedSection : section
      ));
      
      setToast({
        message: 'Section updated successfully',
        type: 'success'
      });
      
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating section:', error);
      setToast({
        message: 'Failed to update section',
        type: 'error'
      });
    }
  };
  
  const handleDeleteSection = async (sectionId: string) => {
    try {
      await ProfileSectionService.deleteSection(userId, sectionId);
      
      setSections(sections.filter(section => section.id !== sectionId));
      
      setToast({
        message: 'Section deleted successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error deleting section:', error);
      setToast({
        message: 'Failed to delete section',
        type: 'error'
      });
    }
  };
  
  const handleReorderSections = async (newOrder: string[]) => {
    try {
      await ProfileSectionService.reorderSections(userId, newOrder);
      
      // Reorder sections locally
      const ordered = [...sections].sort((a, b) => {
        const aIndex = newOrder.indexOf(a.id);
        const bIndex = newOrder.indexOf(b.id);
        return aIndex - bIndex;
      });
      
      setSections(ordered);
      
      setToast({
        message: 'Section order updated',
        type: 'success'
      });
    } catch (error) {
      console.error('Error reordering sections:', error);
      setToast({
        message: 'Failed to update section order',
        type: 'error'
      });
    }
  };
  
  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;
    
    const newSections = [...sections];
    
    if (direction === 'up' && sectionIndex > 0) {
      const temp = newSections[sectionIndex];
      newSections[sectionIndex] = newSections[sectionIndex - 1];
      newSections[sectionIndex - 1] = temp;
    } else if (direction === 'down' && sectionIndex < newSections.length - 1) {
      const temp = newSections[sectionIndex];
      newSections[sectionIndex] = newSections[sectionIndex + 1];
      newSections[sectionIndex + 1] = temp;
    } else {
      return; // No change needed
    }
    
    const newOrder = newSections.map(section => section.id);
    handleReorderSections(newOrder);
  };
  
  const toggleSectionVisibility = (sectionId: string, isVisible: boolean) => {
    handleUpdateSection(sectionId, { isVisible });
  };
  
  const openContentSelector = (section: ProfileSection) => {
    setActiveSection(section);
    setSelectedContentIds(section.contentIds || []);
    setIsAddingContent(true);
  };
  
  const handleAddSelectedContent = async () => {
    if (!activeSection) return;
    
    try {
      const updated = await ProfileSectionService.updateSection(
        userId,
        activeSection.id,
        { contentIds: selectedContentIds }
      );
      
      setSections(sections.map(section => 
        section.id === activeSection.id ? updated : section
      ));
      
      setIsAddingContent(false);
      setActiveSection(null);
      
      setToast({
        message: 'Content added to section',
        type: 'success'
      });
    } catch (error) {
      console.error('Error adding content to section:', error);
      setToast({
        message: 'Failed to add content',
        type: 'error'
      });
    }
  };
  
  const toggleContentSelection = (contentId: string) => {
    if (selectedContentIds.includes(contentId)) {
      setSelectedContentIds(selectedContentIds.filter(id => id !== contentId));
    } else {
      setSelectedContentIds([...selectedContentIds, contentId]);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadSections}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  // Content selector mode
  if (isAddingContent && activeSection) {
    return (
      <div className="space-y-6 bg-white rounded-xl shadow p-6">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
          />
        )}
        
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Add Content to "{activeSection.title}"</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setIsAddingContent(false);
                setActiveSection(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSelectedContent}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Select posts and answers to include in this section
            </p>
          </div>
          
          {isLoadingPosts ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : availablePosts.length > 0 ? (
            <ul className="space-y-2">
              {availablePosts.map(post => (
                <li 
                  key={post.id} 
                  className={`border rounded-md p-3 cursor-pointer ${
                    selectedContentIds.includes(post.id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleContentSelection(post.id)}
                >
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedContentIds.includes(post.id)}
                      onChange={() => toggleContentSelection(post.id)}
                      className="mr-3 mt-1"
                    />
                    <div>
                      <h3 className="font-medium">{post.question}</h3>
                      <div className="text-sm text-gray-500 mt-1">
                        {post.answers?.length || 0} {post.answers?.length === 1 ? 'answer' : 'answers'}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center py-4">No content available</p>
          )}
        </div>
      </div>
    );
  }
  
  // Section management mode
  return (
    <div className="space-y-6 bg-white rounded-xl shadow p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
        />
      )}
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Manage Sections</h2>
        <div className="flex space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-medium mb-2">Your Sections</h3>
        
        {sections.length === 0 ? (
          <p className="text-gray-500 py-4">No custom sections yet. Create your first section below.</p>
        ) : (
          <ul className="space-y-4">
            {sections.map(section => (
              <li key={section.id} className="border border-gray-200 rounded-md p-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-medium">{section.title}</span>
                    <span className="text-sm text-gray-500">
                      {section.type === 'default' ? 'Default' : 'Custom'} • 
                      {section.organizationMethod === 'chronological' ? ' Chronological' : 
                       section.organizationMethod === 'popularity' ? ' Popular' : 
                       section.organizationMethod === 'series' ? ' Series' : ' Custom arrangement'}
                      {section.contentIds?.length > 0 && ` • ${section.contentIds.length} items`}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {/* Up/Down Buttons */}
                    <button
                      onClick={() => moveSection(section.id, 'up')}
                      disabled={sections.indexOf(section) === 0}
                      className={`p-1 rounded-md ${sections.indexOf(section) === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveSection(section.id, 'down')}
                      disabled={sections.indexOf(section) === sections.length - 1}
                      className={`p-1 rounded-md ${sections.indexOf(section) === sections.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      ↓
                    </button>
                    
                    {/* Visibility Toggle */}
                    <button
                      onClick={() => toggleSectionVisibility(section.id, !section.isVisible)}
                      className={`p-1 rounded-md ${section.isVisible ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                      {section.isVisible ? '👁️' : '👁️‍🗨️'}
                    </button>
                    
                    {/* Edit Button */}
                    <button
                      onClick={() => setEditingSection(section)}
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                      ✏️
                    </button>
                    
                    {/* Add Content Button */}
                    <button
                      onClick={() => openContentSelector(section)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded-md"
                    >
                      ➕
                    </button>
                    
                    {/* Delete Button - Only for custom sections */}
                    {section.type === 'custom' && (
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Edit Form */}
                {editingSection && editingSection.id === section.id && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Section Title
                        </label>
                        <input
                          type="text"
                          value={editingSection.title}
                          onChange={(e) => setEditingSection({...editingSection, title: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Organization Method
                        </label>
                        <select
                          value={editingSection.organizationMethod}
                          onChange={(e) => setEditingSection({
                            ...editingSection, 
                            organizationMethod: e.target.value as 'chronological' | 'popularity' | 'series' | 'custom'
                          })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        >
                          <option value="chronological">Chronological (newest first)</option>
                          <option value="popularity">By Popularity (most liked)</option>
                          <option value="series">Series (ordered progression)</option>
                          <option value="custom">Custom (your arrangement)</option>
                        </select>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingSection(null)}
                          className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateSection(section.id, {
                            title: editingSection.title,
                            organizationMethod: editingSection.organizationMethod
                          })}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Create New Section */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-lg font-medium mb-2">Create New Section</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Section title"
            className="flex-1 border border-gray-300 rounded-md shadow-sm p-2"
          />
          <button
            onClick={handleCreateSection}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
} 