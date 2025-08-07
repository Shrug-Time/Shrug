"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchService, SearchResult } from '@/services/standardized/SearchService';
import { SearchBar } from '@/components/common/SearchBar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { QuestionList } from '@/components/questions/QuestionList';
import { FollowButton } from '@/components/common/FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Post, UserProfile, Totem } from '@/types/models';

type SearchFilter = 'all' | 'posts' | 'users' | 'totems';
type SortOption = 'relevance' | 'date' | 'popularity';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') || '';
  const { user: currentUser } = useAuth();
  const router = useRouter();
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  // Perform search when query changes
  useEffect(() => {
    if (query.trim()) {
      performSearch(query.trim());
    } else {
      setResults([]);
      setError(null);
    }
  }, [query, filter, sortBy]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const types = filter === 'all' 
        ? ['post', 'user', 'totem'] 
        : filter === 'posts' 
          ? ['post'] 
          : filter === 'users' 
            ? ['user'] 
            : ['totem'];
      
      const searchResults = await SearchService.search(searchQuery, {
        types: types as any,
        limit: 50,
        sortBy
      });
      
      setResults(searchResults);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (newQuery: string) => {
    router.push(`/search?q=${encodeURIComponent(newQuery)}`);
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
  };

  const getFilteredResults = () => {
    if (filter === 'all') {
      return results;
    }
    const typeMap = {
      'posts': 'post',
      'users': 'user', 
      'totems': 'totem'
    };
    const filtered = results.filter(result => result.type === typeMap[filter]);
    return filtered;
  };

  const renderPostResult = (result: SearchResult) => {
    const post = result.data as Post;
    return (
      <div 
        key={result.id}
        onClick={() => handleResultClick(result)}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 mb-1">{post.question}</h3>
            {result.description && (
              <p className="text-sm text-gray-600 mb-2">{result.description}</p>
            )}
            <div className="flex items-center text-xs text-gray-500 space-x-4">
              <span>by {post.name || post.username}</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              <span>{post.answers?.length || 0} answers</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUserResult = (result: SearchResult) => {
    const user = result.data as UserProfile;
    return (
      <div 
        key={result.id}
        onClick={() => handleResultClick(result)}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {user.photoURL ? (
              <Image 
                src={user.photoURL} 
                alt={user.name || user.username}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-medium text-gray-600">
                  {(user.name || user.username).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900">{user.name || user.username}</h3>
            <p className="text-sm text-gray-600">@{user.username}</p>
            {user.bio && (
              <p className="text-sm text-gray-600 mt-1">{user.bio}</p>
            )}
            <div className="flex items-center text-xs text-gray-500 space-x-4 mt-2">
              <span>{user.followers?.length || 0} followers</span>
              <span>{user.following?.length || 0} following</span>
            </div>
          </div>
          {currentUser && currentUser.uid !== user.firebaseUid && (
            <div onClick={(e) => e.stopPropagation()}>
              <FollowButton
                currentUserId={currentUser.uid}
                targetUserId={user.firebaseUid}
                className="text-sm"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTotemResult = (result: SearchResult) => {
    const totem = result.data as Totem;
    return (
      <div 
        key={result.id}
        onClick={() => handleResultClick(result)}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900">{totem.name}</h3>
            {totem.description && (
              <p className="text-sm text-gray-600 mt-1">{totem.description}</p>
            )}
            <div className="flex items-center text-xs text-gray-500 space-x-4 mt-2">
              <span>{totem.usageCount || 0} uses</span>
              <span>Crispness: {totem.crispness?.toFixed(1) || 0}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResult = (result: SearchResult) => {
    switch (result.type) {
      case 'post':
        return renderPostResult(result);
      case 'user':
        return renderUserResult(result);
      case 'totem':
        return renderTotemResult(result);
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Search</h1>
        <SearchBar 
          className="max-w-2xl"
          onSearch={handleSearch}
          showSuggestions={true}
        />
      </div>

      {/* Search Query Display */}
      {query && (
        <div className="mb-6">
          <p className="text-lg text-gray-700">
            Search results for <span className="font-semibold">"{query}"</span>
          </p>
        </div>
      )}

      {/* Filters and Sort */}
      {query && (
        <div className="mb-6 flex flex-wrap items-center gap-4">
          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'posts', 'users', 'totems'] as SearchFilter[]).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  filter === filterOption
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="date">Sort by Date</option>
            <option value="popularity">Sort by Popularity</option>
          </select>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => performSearch(query)}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && query && (
        <div className="space-y-4">
          {getFilteredResults().length > 0 ? (
            getFilteredResults().map(renderResult)
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!query && !isLoading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Start searching</h3>
          <p className="text-gray-600">
            Search for questions, users, or totems to discover content on Shrug.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
} 