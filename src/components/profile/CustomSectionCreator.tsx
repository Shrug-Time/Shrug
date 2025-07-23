import { useState, useEffect } from 'react';
import { ProfileSection, Post, Totem } from '@/types/models';
import { ProfileSectionService } from '@/services/profileSectionService';
import { getUserAnswers } from '@/services/answerService';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Toast } from '@/components/common/Toast';

// Define sort options type
type SortOption = 'newest' | 'oldest' | 'popular';

interface CustomSectionCreatorProps {
  userId: string;
  section?: ProfileSection; // Provide for editing, omit for creation
  defaultOrganizationMethod?: 'chronological' | 'popularity' | 'series' | 'custom';
  onSave: (section: ProfileSection) => void;
  onCancel: () => void;
}

export function CustomSectionCreator({ 
  userId, 
  section, 
  defaultOrganizationMethod = 'chronological',
  onSave, 
  onCancel 
}: CustomSectionCreatorProps) {
  const [title, setTitle] = useState(section?.title || '');
  const [organizationMethod, setOrganizationMethod] = useState<'chronological' | 'popularity' | 'series' | 'custom'>(
    section?.organizationMethod || defaultOrganizationMethod
  );
  const [answers, setAnswers] = useState<Post[]>([]);
  const [filteredAnswers, setFilteredAnswers] = useState<Post[]>([]);
  const [selectedAnswerIds, setSelectedAnswerIds] = useState<string[]>(section?.contentIds || []);
  const [isLoading, setIsLoading] = useState(true);
  const [totems, setTotems] = useState<string[]>([]);
  const [selectedTotem, setSelectedTotem] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [orderedSelectedAnswers, setOrderedSelectedAnswers] = useState<string[]>([]);
  const [step, setStep] = useState<'info' | 'content' | 'order'>('info');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Load user answers and extract totems
  useEffect(() => {
    const loadAnswers = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching user answers...');
        const userAnswers = await getUserAnswers(userId);
        console.log('Received user answers:', userAnswers.length, userAnswers);
        
        // If no answers were found, check if there's a problem
        if (userAnswers.length === 0) {
          // Try to get posts as a fallback to see if query is working
          try {
            console.log('No answers found, checking if user has any posts...');
            // Using PostService if available
            const { PostService } = await import('@/services/standardized');
            const postResult = await PostService.getUserPosts(userId, 10);
            console.log('User posts result:', postResult);
            
            if (postResult.posts && postResult.posts.length > 0) {
              console.log('User has posts but no answers. This might be expected.');
              setToast({
                message: 'No answers found for your profile. Create some answers first!',
                type: 'info'
              });
            } else {
              console.log('User has no posts either. Might be a data access issue.');
              setToast({
                message: 'Unable to retrieve your content. This might be a permissions issue.',
                type: 'error'
              });
            }
          } catch (fallbackError) {
            console.error('Error in fallback check:', fallbackError);
          }
        }
        
        // Sort initially by newest first (default)
        const sortedAnswers = [...userAnswers].sort((a, b) => b.createdAt - a.createdAt);
        
        setAnswers(sortedAnswers);
        setFilteredAnswers(sortedAnswers);
        
        // Extract unique totems from all answers
        const totemSet = new Set<string>();
        userAnswers.forEach(post => {
          post.answers?.forEach(answer => {
            answer.totems?.forEach(totem => {
              if (totem.name) {
                totemSet.add(totem.name);
              }
            });
          });
          post.totemAssociations?.forEach(association => {
            if (association.totemName) {
              totemSet.add(association.totemName);
            }
          });
        });
        
        const totemArray = Array.from(totemSet).sort();
        console.log('Extracted totems:', totemArray);
        setTotems(totemArray);
        
        // Initialize ordered list if in edit mode
        if (section && (section.organizationMethod === 'series' || section.organizationMethod === 'custom')) {
          setOrderedSelectedAnswers(section.contentIds);
        }
      } catch (error) {
        console.error('Error loading answers:', error);
        setToast({
          message: 'Failed to load your answers',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAnswers();
  }, [userId, section]);
  
  // Update ordered list when selection changes
  useEffect(() => {
    // Only if not in edit mode or if adding new items
    if (!section || selectedAnswerIds.length > orderedSelectedAnswers.length) {
      // Add new items to the end of the ordered list
      const newItems = selectedAnswerIds.filter(id => !orderedSelectedAnswers.includes(id));
      setOrderedSelectedAnswers([...orderedSelectedAnswers, ...newItems]);
    }
    
    // Remove items that are no longer selected
    setOrderedSelectedAnswers(prev => prev.filter(id => selectedAnswerIds.includes(id)));
  }, [selectedAnswerIds]);
  
  // Filter answers by selected totem
  useEffect(() => {
    console.log('Filtering answers...', { 
      selectedTotem, 
      totalAnswers: answers.length, 
      sortOption 
    });
    
    let filtered = [...answers];
    
    // Apply totem filter if selected
    if (selectedTotem) {
      filtered = filtered.filter(post => {
        // Check post's totem associations
        const hasTotemInPost = post.totemAssociations?.some(
          association => association.totemName === selectedTotem
        );
        
        // Check answers for totems
        const hasTotemInAnswers = post.answers?.some(answer => 
          answer.totems?.some(totem => totem.name === selectedTotem)
        );
        
        return hasTotemInPost || hasTotemInAnswers;
      });
    }
    
    // Apply sort
    filtered = sortAnswers(filtered, sortOption);
    console.log('Filtered answers:', filtered.length, filtered);
    
    setFilteredAnswers(filtered);
  }, [selectedTotem, answers, sortOption]);
  
  // Sort answers based on the selected sort option
  const sortAnswers = (postsToSort: Post[], option: SortOption): Post[] => {
    const sorted = [...postsToSort];
    
    switch (option) {
      case 'newest':
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      case 'oldest':
        return sorted.sort((a, b) => a.createdAt - b.createdAt);
      case 'popular':
        return sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
      default:
        return sorted;
    }
  };
  
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value as SortOption);
  };
  
  const handleTotemFilter = (totem: string | null) => {
    setSelectedTotem(totem);
  };
  
  const handleSelectAllFiltered = () => {
    const filteredIds = filteredAnswers.map(post => post.id);
    const newSelection = Array.from(new Set([...selectedAnswerIds, ...filteredIds]));
    setSelectedAnswerIds(newSelection);
  };
  
  const handleToggleAnswer = (answerId: string) => {
    if (selectedAnswerIds.includes(answerId)) {
      setSelectedAnswerIds(selectedAnswerIds.filter(id => id !== answerId));
    } else {
      setSelectedAnswerIds([...selectedAnswerIds, answerId]);
    }
  };
  
  const handleDragStart = (answerId: string) => {
    setDraggedItem(answerId);
  };
  
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === targetId) return;
    
    const draggedIndex = orderedSelectedAnswers.indexOf(draggedItem);
    const targetIndex = orderedSelectedAnswers.indexOf(targetId);
    
    if (draggedIndex < 0 || targetIndex < 0) return;
    
    // Reorder the list
    const newOrder = [...orderedSelectedAnswers];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    
    setOrderedSelectedAnswers(newOrder);
  };
  
  const handleDragEnd = () => {
    setDraggedItem(null);
  };
  
  const moveItem = (answerId: string, direction: 'up' | 'down') => {
    const index = orderedSelectedAnswers.indexOf(answerId);
    if (index < 0) return;
    
    const newOrder = [...orderedSelectedAnswers];
    
    if (direction === 'up' && index > 0) {
      // Swap with the item above
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      // Swap with the item below
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    
    setOrderedSelectedAnswers(newOrder);
  };
  
  const handleSave = async () => {
    if (!title.trim()) {
      setToast({
        message: 'Please enter a section title',
        type: 'error'
      });
      return;
    }
    
    try {
      const sectionData: Omit<ProfileSection, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        type: 'custom',
        organizationMethod,
        // Use the ordered list for series/custom, otherwise just use the selection
        contentIds: (organizationMethod === 'series' || organizationMethod === 'custom') 
          ? orderedSelectedAnswers 
          : selectedAnswerIds,
        position: section?.position ?? 0, // Default to 0 for new sections
        isVisible: section?.isVisible ?? true
      };
      
      // Update existing section or create new one
      const savedSection = section?.id 
        ? await ProfileSectionService.updateSection(userId, section.id, sectionData)
        : await ProfileSectionService.createSection(userId, sectionData);
      
      onSave(savedSection);
      
      setToast({
        message: `Section ${section ? 'updated' : 'created'} successfully`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving section:', error);
      setToast({
        message: `Failed to ${section ? 'update' : 'create'} section`,
        type: 'error'
      });
    }
  };
  
  const handleNextStep = () => {
    if (step === 'info') {
      if (!title.trim()) {
        setToast({
          message: 'Please enter a section title',
          type: 'error'
        });
        return;
      }
      setStep('content');
    } else if (step === 'content') {
      if (selectedAnswerIds.length === 0) {
        setToast({
          message: 'Please select at least one answer',
          type: 'error'
        });
        return;
      }
      
      if (organizationMethod === 'series' || organizationMethod === 'custom') {
        setStep('order');
      } else {
        handleSave();
      }
    } else {
      handleSave();
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6 bg-white rounded-xl shadow p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
        />
      )}
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {section ? 'Edit' : 'Create'} Custom Section
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleNextStep}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {step === 'order' ? 'Save' : 'Next'}
          </button>
        </div>
      </div>
      
      {/* Step 1: Basic Information */}
      {step === 'info' && (
        <div className="space-y-6 pt-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Section Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 'Fly Fishing Basics' or 'Advanced Techniques'"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="organizationMethod" className="block text-sm font-medium text-gray-700 mb-1">
              Section Type
            </label>
            <p className="text-sm text-gray-500 mb-3">Choose how you want to organize content in this section</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Series/Curriculum Option */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  organizationMethod === 'series' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setOrganizationMethod('series')}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="organizationMethod"
                    value="series"
                    checked={organizationMethod === 'series'}
                    onChange={() => setOrganizationMethod('series')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-900">
                    📚 Curriculum/Series
                  </label>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  Create a structured learning path where content is presented in a specific order. 
                  Perfect for tutorials, courses, or step-by-step guides.
                </p>
              </div>
              
              {/* Other options */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  organizationMethod === 'chronological' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setOrganizationMethod('chronological')}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="organizationMethod"
                    value="chronological"
                    checked={organizationMethod === 'chronological'}
                    onChange={() => setOrganizationMethod('chronological')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-900">
                    🕒 Chronological
                  </label>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  Show newest content first. Great for updates, news, or recent discoveries.
                </p>
              </div>
              
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  organizationMethod === 'popularity' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setOrganizationMethod('popularity')}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="organizationMethod"
                    value="popularity"
                    checked={organizationMethod === 'popularity'}
                    onChange={() => setOrganizationMethod('popularity')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-900">
                    ⭐ By Popularity
                  </label>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  Show most liked content first. Highlights your best and most engaging answers.
                </p>
              </div>
              
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  organizationMethod === 'custom' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setOrganizationMethod('custom')}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="organizationMethod"
                    value="custom"
                    checked={organizationMethod === 'custom'}
                    onChange={() => setOrganizationMethod('custom')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-900">
                    🎯 Custom Order
                  </label>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  Arrange content in any order you prefer. Full control over organization.
                </p>
              </div>
            </div>
            
            {(organizationMethod === 'series' || organizationMethod === 'custom') && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      {organizationMethod === 'series' ? 'Creating a Curriculum' : 'Custom Arrangement'}
                    </h4>
                    <p className="text-sm text-blue-700">
                      {organizationMethod === 'series' 
                        ? 'You\'ll be able to arrange your content in a logical learning sequence. Each item will be numbered and presented as steps in a progression.'
                        : 'You\'ll be able to arrange your content in any order you prefer using drag-and-drop or arrow controls.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Step 2: Content Selection */}
      {step === 'content' && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Select Answers to Include</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAllFiltered}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
              >
                Add All Shown
              </button>
            </div>
          </div>
          
          {/* Filter and Sort Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleTotemFilter(null)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedTotem === null 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                
                {totems.map(totem => (
                  <button
                    key={totem}
                    onClick={() => handleTotemFilter(totem)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedTotem === totem 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {totem}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="w-48">
              <select
                value={sortOption}
                onChange={handleSortChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
                aria-label="Sort answers"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="popular">Sort: Most Popular</option>
              </select>
            </div>
          </div>
          
          {filteredAnswers.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-gray-500">No answers found</p>
              <div className="bg-blue-50 p-4 rounded-md mx-auto max-w-md">
                <h4 className="font-medium text-blue-700 mb-2">Why might this happen?</h4>
                <ul className="text-sm text-blue-600 text-left list-disc pl-5 space-y-1">
                  <li>You haven't created any answers yet</li>
                  <li>The selected totem filter is too restrictive</li>
                  <li>Your posts might not be stored as "answers" in the database</li>
                </ul>
                <p className="text-sm text-blue-600 mt-3">
                  Try creating some answers first, or ask your administrator about how content is stored.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {filteredAnswers.map(post => (
                <div
                  key={post.id}
                  className={`border p-3 rounded-md ${
                    selectedAnswerIds.includes(post.id) 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleToggleAnswer(post.id)}
                >
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedAnswerIds.includes(post.id)}
                      onChange={() => handleToggleAnswer(post.id)}
                      className="mr-3 mt-1"
                      onClick={e => e.stopPropagation()}
                    />
                    <div>
                      <h4 className="font-medium">{post.question}</h4>
                      {post.answers && post.answers[0] && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {post.answers[0].text}
                        </p>
                      )}
                      <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-1">
                        {post.totemAssociations?.map(assoc => (
                          <span key={assoc.totemId} className="px-2 py-0.5 bg-gray-100 rounded-full">
                            {assoc.totemName}
                          </span>
                        ))}
                        <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        {post.score !== undefined && (
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                            Score: {post.score}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="border-t pt-3 mt-4">
            <p className="text-sm text-gray-500">
              Selected {selectedAnswerIds.length} answer{selectedAnswerIds.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      )}
      
      {/* Step 3: Order Selection (only for series/custom) */}
      {step === 'order' && (organizationMethod === 'series' || organizationMethod === 'custom') && (
        <div className="space-y-4 pt-4">
          <h3 className="font-medium">Arrange Items in Order</h3>
          <p className="text-sm text-gray-500">
            Drag and drop to reorder or use the arrows to move items up and down.
          </p>
          
          {orderedSelectedAnswers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No items selected</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {orderedSelectedAnswers.map((answerId, index) => {
                const post = answers.find(a => a.id === answerId);
                if (!post) return null;
                
                return (
                  <div
                    key={post.id}
                    draggable
                    onDragStart={() => handleDragStart(post.id)}
                    onDragOver={e => handleDragOver(e, post.id)}
                    onDragEnd={handleDragEnd}
                    className={`border p-3 rounded-md flex items-center ${
                      draggedItem === post.id ? 'border-blue-500 bg-blue-50 opacity-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="mr-2 text-gray-400 cursor-move">☰</div>
                    <div className="flex-1">
                      <h4 className="font-medium">{post.question}</h4>
                      {post.answers && post.answers[0] && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {post.answers[0].text}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveItem(post.id, 'up')}
                        disabled={index === 0}
                        className={`p-1 ${index === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveItem(post.id, 'down')}
                        disabled={index === orderedSelectedAnswers.length - 1}
                        className={`p-1 ${
                          index === orderedSelectedAnswers.length - 1 
                            ? 'text-gray-300' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Debug panel - only visible during development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-8 border-t pt-4 border-gray-300">
          <details>
            <summary className="font-medium text-gray-700 cursor-pointer">Debug Information</summary>
            <div className="mt-2 p-4 bg-gray-100 rounded-md text-xs font-mono whitespace-pre-wrap">
              <div className="mb-2">
                <div><strong>User ID:</strong> {userId}</div>
                <div><strong>Total Answers:</strong> {answers.length}</div>
                <div><strong>Filtered Answers:</strong> {filteredAnswers.length}</div>
                <div><strong>Selected Answers:</strong> {selectedAnswerIds.length}</div>
                <div><strong>Available Totems:</strong> {totems.join(', ')}</div>
                <div><strong>Selected Totem:</strong> {selectedTotem || 'None'}</div>
                <div><strong>Sort Option:</strong> {sortOption}</div>
              </div>
              <div>
                <button 
                  onClick={async () => {
                    try {
                      // Import Firestore directly for diagnosis
                      const { collection, getDocs } = await import('firebase/firestore');
                      const { db } = await import('@/lib/firebase');
                      
                      // Check posts collection structure
                      const postsSnapshot = await getDocs(collection(db, 'posts'));
                      console.log('Posts collection sample:', 
                        postsSnapshot.empty ? 'Empty collection' : 
                        postsSnapshot.docs.slice(0, 3).map(d => ({id: d.id, data: d.data()}))
                      );
                      
                      // Check if there are any documents with type=answer
                      const answerSamples = postsSnapshot.docs
                        .filter(doc => doc.data().type === 'answer')
                        .slice(0, 3);
                        
                      console.log('Answer samples:', 
                        answerSamples.length ? answerSamples.map(d => ({id: d.id, data: d.data()})) : 
                        'No answers found in collection'  
                      );
                      
                      alert(`Collection check completed. Found ${postsSnapshot.docs.length} posts, ${answerSamples.length} answers. See console for details.`);
                    } catch (error) {
                      console.error('Debug check failed:', error);
                      alert('Failed to check collections: ' + (error as Error).message);
                    }
                  }}
                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
                >
                  Check Collection Structure
                </button>
              </div>
              <div>
                <button 
                  onClick={() => {
                    // Safely try to access Firebase
                    try {
                      console.log('Debug info - checking for sample post fields');
                      
                      // Check what fields are present on a sample post
                      if (answers.length > 0) {
                        console.log('Sample post fields:', Object.keys(answers[0]));
                        
                        // Check specific relevant fields using safer type checking
                        const samplePost = answers[0] as any; // Use any for debugging to check fields
                        console.log('User identifier field:', 
                          samplePost.firebaseUid ? 'firebaseUid' : 
                          samplePost.authorId ? 'authorId' : 
                          samplePost.userId ? 'userId' : 
                          'unknown'
                        );
                        
                        alert('Check the console for post field names');
                      } else {
                        // Try to get a sample post directly to check fields
                        try {
                          // Import Firestore directly for diagnosis
                          import('firebase/firestore').then(({ collection, getDocs, limit, query }) => {
                            import('@/lib/firebase').then(({ db }) => {
                              // Get any single post to check its field structure
                              const sampleQuery = query(collection(db, 'posts'), limit(1));
                              getDocs(sampleQuery).then(snapshot => {
                                if (!snapshot.empty) {
                                  const sampleData = snapshot.docs[0].data();
                                  console.log('Sample post fields from direct query:', Object.keys(sampleData));
                                  console.log('Sample post data:', sampleData);
                                  
                                  alert('Check the console for a sample post structure');
                                } else {
                                  alert('No posts found in the database');
                                }
                              });
                            });
                          });
                        } catch (importError) {
                          console.error('Failed to check post fields:', importError);
                          alert('Failed to check post fields: ' + (importError as Error).message);
                        }
                      }
                    } catch (debugError) {
                      console.error('Debug error:', debugError);
                    }
                  }}
                  className="px-2 py-1 bg-green-500 text-white text-xs rounded ml-2"
                >
                  Check Post Fields
                </button>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
} 