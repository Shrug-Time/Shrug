import React from 'react';

/**
 * URL regex pattern to match various URL formats
 */
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

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
      return (
        <a
          key={index}
          href={part}
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
 * Component for rendering formatted text with links
 */
interface FormattedTextProps {
  text: string;
  className?: string;
  maxLength?: number;
}

export function FormattedText({ text, className = '', maxLength }: FormattedTextProps) {
  const processedText = maxLength ? truncateText(text, maxLength) : text;
  
  return (
    <span className={className}>
      {formatText(processedText)}
    </span>
  );
}