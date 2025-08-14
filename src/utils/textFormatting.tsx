import React from 'react';

/**
 * URL regex pattern to match various URL formats:
 * - Full URLs: https://example.com, http://example.com
 * - Domain names: example.com, subdomain.example.com
 * - With www: www.example.com  
 * - All TLDs: .com, .org, .gov, .edu, .net, .uk, .tech, etc.
 * - With paths: example.com/path/to/page
 */
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|(?:www\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;

/**
 * Email regex pattern
 */
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

/**
 * Converts URLs and email addresses in text to clickable links
 * @param text The text to process
 * @returns JSX elements with clickable links
 */
export function linkifyText(text: string): React.ReactNode {
  if (!text) return null;

  // Split text by URLs and emails
  const parts = text.split(URL_REGEX);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0; // Reset regex for next use
      
      // Add protocol if missing
      const href = part.startsWith('http://') || part.startsWith('https://') 
        ? part 
        : `https://${part}`;
      
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
          onClick={(e) => e.stopPropagation()} // Prevent event bubbling
        >
          {part}
        </a>
      );
    }
    
    // Check if this part contains email addresses
    if (EMAIL_REGEX.test(part)) {
      const emailParts = part.split(EMAIL_REGEX);
      return emailParts.map((emailPart, emailIndex) => {
        if (EMAIL_REGEX.test(emailPart)) {
          EMAIL_REGEX.lastIndex = 0; // Reset regex for next use
          return (
            <a
              key={`${index}-${emailIndex}`}
              href={`mailto:${emailPart}`}
              className="text-blue-600 hover:text-blue-800 underline break-all"
              onClick={(e) => e.stopPropagation()} // Prevent event bubbling
            >
              {emailPart}
            </a>
          );
        }
        return emailPart;
      });
    }
    
    // Regular text - preserve line breaks
    return part.split('\n').map((line, lineIndex, lines) => (
      <React.Fragment key={`${index}-${lineIndex}`}>
        {line}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  });
}

/**
 * Formats text with line breaks and clickable links
 * @param text The text to format
 * @returns JSX elements with formatted text
 */
export function formatText(text: string): React.ReactNode {
  if (!text) return null;
  
  return linkifyText(text);
}

/**
 * Extracts all URLs from a text string
 * @param text The text to extract URLs from
 * @returns Array of URLs found in the text
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  
  const matches = text.match(URL_REGEX);
  return matches || [];
}

/**
 * Validates if a string is a valid URL
 * @param url The URL to validate
 * @returns true if valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Truncates text to a specified length and adds ellipsis
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Smart truncation for answer previews - shows first paragraph up to word limit
 * @param text The text to truncate
 * @param maxWords Maximum number of words (default: 25)
 * @param firstParagraphMaxWords Maximum words for first paragraph to show in full (default: 30)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateAnswerPreview(text: string, maxWords: number = 25, firstParagraphMaxWords: number = 30): string {
  if (!text) return '';
  
  // Get first paragraph
  const firstParagraph = text.split('\n')[0] || '';
  const words = firstParagraph.split(/\s+/).filter(word => word.length > 0);
  
  // If first paragraph is within the comfortable limit, show it all
  if (words.length <= firstParagraphMaxWords) {
    return firstParagraph;
  }
  
  // Otherwise, truncate to maxWords with ellipsis
  const truncatedWords = words.slice(0, maxWords);
  return truncatedWords.join(' ') + '...';
}

/**
 * Component for rendering formatted text with links
 */
interface FormattedTextProps {
  text: string;
  className?: string;
  maxLength?: number;
  disableLinks?: boolean; // Option to disable link creation when inside other links
}

export function FormattedText({ text, className = '', maxLength, disableLinks = false }: FormattedTextProps) {
  const processedText = maxLength ? truncateText(text, maxLength) : text;
  
  if (disableLinks) {
    // Just return text with line breaks, no links
    return (
      <span className={className}>
        {processedText.split('\n').map((line, index, lines) => (
          <React.Fragment key={index}>
            {line}
            {index < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  }
  
  return (
    <span className={className}>
      {formatText(processedText)}
    </span>
  );
}

/**
 * Test function to check if URL regex works with various formats
 * (for debugging - remove in production)
 */
export function testUrlRegex() {
  const testUrls = [
    'x.com',
    'example.org', 
    'government.gov',
    'university.edu',
    'site.net',
    'www.example.com',
    'subdomain.example.co.uk',
    'https://example.com',
    'http://test.tech',
    'blog.site/path/to/page'
  ];
  
  console.log('URL Regex Test Results:');
  testUrls.forEach(url => {
    const matches = URL_REGEX.test(url);
    URL_REGEX.lastIndex = 0; // Reset for next test
    console.log(`${url} → ${matches ? '✅ Match' : '❌ No match'}`);
  });
}