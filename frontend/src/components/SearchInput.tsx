import React, { useState, useRef, useEffect } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (symbol: string) => void;
}

/**
 * SearchInput Component
 * Provides search input field with dropdown suggestions.
 * Filters FII list by symbol prefix and name prefix (case-insensitive).
 * Shows up to 10 suggestions.
 * 
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

// Mock FII data for search suggestions
const AVAILABLE_FIIS = [
  { symbol: 'MXRF11', name: 'Maxi Renda Fixa Imobiliário' },
  { symbol: 'HGLG11', name: 'CSHG Seguridade Imobiliário' },
  { symbol: 'KNSC11', name: 'Kinea Sustentabilidade Imobiliário' },
  { symbol: 'VGIR11', name: 'Vanguarda Global Imobiliário' },
  { symbol: 'BRRL11', name: 'BR Retail Logística' },
  { symbol: 'TRXL11', name: 'TRX Trade Trust' },
  { symbol: 'MALL11', name: 'MALLR Shoppings Imobiliário' },
  { symbol: 'PARD11', name: 'Pátria Imobiliário' },
  { symbol: 'XPLG11', name: 'XP Log Imobiliário' },
  { symbol: 'RZTR11', name: 'Ritz Retail Fundo Imobiliário' },
];

export default function SearchInput({ value, onChange, onSelect }: SearchInputProps) {
  const [suggestions, setSuggestions] = useState<typeof AVAILABLE_FIIS>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on search value
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      setSelectedIndex(-1);
      setIsOpen(false);
      return;
    }

    const query = value.toLowerCase();
    const filtered = AVAILABLE_FIIS.filter(
      (fii) =>
        fii.symbol.toLowerCase().includes(query) ||
        fii.name.toLowerCase().includes(query)
    ).slice(0, 10); // Max 10 results

    setSuggestions(filtered);
    setSelectedIndex(-1);
    // Keep dropdown open when search has a value, even if no matches
    setIsOpen(true);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex].symbol);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleSelectSuggestion = (symbol: string) => {
    onSelect(symbol);
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by symbol (e.g., MXRF11) or name..."
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors placeholder-gray-500"
          aria-autocomplete="list"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls="search-suggestions"
        />

        {/* Search icon */}
        <svg
          className="absolute right-3 top-2.5 w-5 h-5 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          id="search-suggestions"
          className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {suggestions.length === 0 ? (
            <div className="px-4 py-3 text-gray-400 text-sm">
              No FIIs found matching your search
            </div>
          ) : (
            <ul role="listbox">
              {suggestions.map((fii, index) => (
                <li
                  key={fii.symbol}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => handleSelectSuggestion(fii.symbol)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-600 bg-opacity-50 text-white'
                      : 'text-gray-100 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-semibold text-sm">{fii.symbol}</div>
                  <div className="text-xs text-gray-400 mt-1">{fii.name}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* No results message */}
      {isOpen && value.trim() && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 px-4 py-3">
          <p className="text-gray-400 text-sm">No FIIs found matching "{value}"</p>
        </div>
      )}
    </div>
  );
}
