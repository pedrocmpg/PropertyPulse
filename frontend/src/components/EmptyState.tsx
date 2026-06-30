import React from 'react';

export type EmptyStateType = 'noSelection' | 'noSearchResults';

interface EmptyStateProps {
  /**
   * Type of empty state to display
   * - 'noSelection': Dashboard first loads, no FIIs selected (Requirement 10.2)
   * - 'noSearchResults': Search performed with no matching results (Requirement 10.1)
   */
  type?: EmptyStateType;
  /**
   * Search query that produced no results (used for noSearchResults type)
   */
  searchQuery?: string;
}

/**
 * EmptyState Component
 * Displays guidance message when no FII data is available.
 * Supports two scenarios:
 * 1. No FIIs selected (initial load) - Requirement 10.2
 * 2. No search results found - Requirement 10.1
 * Provides suggestions on how to proceed - Requirement 10.3
 * Supports smooth transitions from data to empty state - Requirement 10.4
 * 
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */
export default function EmptyState({ type = 'noSelection', searchQuery = '' }: EmptyStateProps) {
  const isNoSearchResults = type === 'noSearchResults';

  return (
    <div className="w-full max-w-2xl mx-auto py-12">
      <div className="text-center">
        {/* Empty state icon */}
        <div className="flex justify-center mb-6">
          <svg
            className="w-16 h-16 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>

        {/* Main message - varies by type */}
        <h2 className="text-2xl font-bold text-white mb-2">
          {isNoSearchResults ? 'No FIIs Found' : 'No FIIs Selected'}
        </h2>
        <p className="text-gray-300 mb-6">
          {isNoSearchResults
            ? `No FIIs found matching your search${searchQuery ? ` for "${searchQuery}"` : ''}. Try different symbols or search terms.`
            : 'Select FIIs to display on your dashboard'}
        </p>

        {/* Guidance section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">
            {isNoSearchResults ? 'Try searching for:' : 'How to get started:'}
          </h3>
          <ul className="text-left text-gray-300 space-y-3">
            {isNoSearchResults ? (
              <>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>MXRF11 - Maxi Renda Fixa Imobiliário</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>HGLG11 - CSHG Seguridade Imobiliário</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>KNSC11 - Kinea Sustentabilidade Imobiliário</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>Use partial symbols like "RF" or "HG"</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Use the search box above to find FIIs by symbol or name</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Try searching for popular symbols like:</span>
                </li>
                <li className="ml-6 text-gray-400">
                  • MXRF11 - Maxi Renda Fixa Imobiliário
                </li>
                <li className="ml-6 text-gray-400">
                  • HGLG11 - CSHG Seguridade Imobiliário
                </li>
                <li className="ml-6 text-gray-400">
                  • KNSC11 - Kinea Sustentabilidade Imobiliário
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>Click on an FII to add it to your dashboard</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">4.</span>
                  <span>Your selections will be saved for your next visit</span>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Additional information */}
        <p className="text-sm text-gray-400">
          Real-time FII data powered by brAPI
        </p>
      </div>
    </div>
  );
}
