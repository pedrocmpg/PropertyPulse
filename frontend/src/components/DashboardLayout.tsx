import React, { useState } from 'react';
import { FormattedFII, FIIPrettyPrinter } from '@/types';
import { useFIIData } from '@/hooks/useFIIData';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import SearchInput from './SearchInput';
import FIICard from './FIICard';
import FIIDetailView from './FIIDetailView';

interface DashboardLayoutProps {
  selectedFIIs: string[];
  onAddFII: (symbol: string) => void;
  onRemoveFII: (symbol: string) => void;
  onFIIDetailClick?: (fii: FormattedFII) => void;
  theme?: 'dark' | 'light';
}

/**
 * DashboardLayoutWithPreferences Component
 * Integrates useUserPreferences and useFIIData hooks to provide full dashboard functionality
 * with localStorage persistence
 * 
 * Task 17.2: Wire SearchInput to add FIIs to dashboard
 * - On SearchInput select: add symbol to selectedFIIs via useUserPreferences.addFII()
 * - Persist selected FIIs to localStorage (automatic via useUserPreferences)
 * - Trigger re-fetch of FII data (automatic via useFIIData watching selectedFIIs)
 * 
 * Validates: Requirements 18.1, 18.2, 18.3, 18.4, 12.5
 */
export function DashboardLayoutWithPreferences() {
  const { selectedFIIs, addFII, removeFII, theme, setTheme, refreshInterval, clearPreferences } =
    useUserPreferences();
  const { data: fiiData, isLoading, error, isEmpty, refresh } = useFIIData(selectedFIIs, {
    refreshInterval,
  });
  const [selectedDetailFII, setSelectedDetailFII] = useState<FormattedFII | null>(null);

  // Apply theme preference to document root on mount and theme change
  React.useEffect(() => {
    try {
      const htmlElement = document.documentElement;
      if (theme === 'dark') {
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  }, [theme]);

  /**
   * Handle FII selection from SearchInput
   * - Adds symbol to selectedFIIs (triggers localStorage save via useUserPreferences)
   * - Automatically triggers useFIIData re-fetch because selectedFIIs changed
   * 
   * Validates: Requirements 12.5 (Search and Filter), 18.1 (Persist selection), 18.2 (Restore selection)
   */
  const handleAddFII = (symbol: string) => {
    addFII(symbol);
    // No manual trigger needed - useFIIData automatically watches selectedFIIs and re-fetches
    // useUserPreferences automatically persists to localStorage
  };

  const handleRemoveFII = (symbol: string) => {
    removeFII(symbol);
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleResetDashboard = () => {
    if (confirm('Are you sure you want to reset all preferences?')) {
      clearPreferences();
    }
  };

  const handleFIICardClick = (fii: FormattedFII) => {
    setSelectedDetailFII(fii);
  };

  const handleDetailViewClose = () => {
    setSelectedDetailFII(null);
  };

  const handleDetailViewRefresh = async () => {
    // Refresh data for the currently selected FII
    await refresh();
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              FII Dashboard
            </h1>
            <div className="flex gap-2">
              <button
                onClick={handleThemeToggle}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                }`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                onClick={handleResetDashboard}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                title="Reset all preferences"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Search and Refresh */}
          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <div className="w-full sm:flex-1">
              <SearchInput
                value=""
                onChange={() => {}}
                onSelect={handleAddFII}
              />
            </div>
            <button
              onClick={refresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Selected FIIs Tags */}
          {selectedFIIs.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedFIIs.map((symbol) => (
                <div
                  key={symbol}
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    theme === 'dark'
                      ? 'bg-blue-900 text-blue-100'
                      : 'bg-blue-100 text-blue-900'
                  }`}
                >
                  {symbol}
                  <button
                    onClick={() => handleRemoveFII(symbol)}
                    className="ml-1 hover:font-bold"
                    title={`Remove ${symbol}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Loading State */}
        {isLoading && !Object.keys(fiiData).length && (
          <div className="mb-6">
            <LoadingState />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6">
            <ErrorState error={error} onRetry={refresh} />
          </div>
        )}

        {/* Empty State */}
        {isEmpty && !isLoading && (
          <div className="mb-6">
            <EmptyState />
          </div>
        )}

        {/* FII Cards Grid */}
        {!isEmpty && Object.keys(fiiData).length > 0 && (
          <>
            {/* Loading overlay when refreshing */}
            {isLoading && (
              <div className={`mb-6 p-4 rounded-lg ${
                theme === 'dark'
                  ? 'bg-blue-900 bg-opacity-50 text-blue-100'
                  : 'bg-blue-100 text-blue-900'
              }`}>
                Updating FII data...
              </div>
            )}

            {/* Responsive grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(fiiData).map((fii) => {
                const formattedFII = FIIPrettyPrinter.prettyPrintFII({
                  symbol: fii.symbol,
                  price: fii.price,
                  nav: fii.nav,
                  pvRatio: fii.pvRatio,
                  dividendYield1Month: fii.dividendYield1Month,
                  dividendYield12Month: fii.dividendYield12Month,
                  monthlyReturn: fii.monthlyReturn,
                  investorCount: fii.investorCount,
                  totalAssets: fii.totalAssets,
                  administrator: fii.administrator,
                });

                return (
                  <div
                    key={fii.symbol}
                    onClick={() => handleFIICardClick(formattedFII)}
                    className="cursor-pointer"
                  >
                    <FIICard fii={formattedFII} />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Detail View Modal */}
        {selectedDetailFII && (
          <FIIDetailView
            fii={selectedDetailFII}
            isOpen={!!selectedDetailFII}
            onClose={handleDetailViewClose}
            onRefresh={handleDetailViewRefresh}
            isRefreshing={isLoading}
          />
        )}
      </div>
    </div>
  );
}

/**
 * DashboardLayout Component
 * Main container orchestrating the dashboard layout with:
 * - Integration of useFIIData hook to fetch data on mount and when selectedFIIs changes
 * - Header with search input and refresh button
 * - Responsive FII cards grid (1 col mobile, 2 col tablet, 3+ col desktop)
 * - Binding of LoadingState, ErrorState, EmptyState to hook state
 * - Wiring of refresh button to hook.refresh()
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 14.1, 14.2, 14.3, 14.4, 14.5,
 *            11.1, 11.2, 11.4, 11.5, 11.6, 11.7, 11.8, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8
 */
export default function DashboardLayout({
  selectedFIIs,
  onAddFII,
  onRemoveFII,
  onFIIDetailClick,
  theme = 'dark',
}: DashboardLayoutProps) {
  // Subtask 1: Call useFIIData(selectedFIIs) to fetch data on mount and when selectedFIIs changes
  const { data: fiiData, isLoading, error, isEmpty, refresh } = useFIIData(selectedFIIs);

  const [searchValue, setSearchValue] = useState('');
  const [selectedDetailFII, setSelectedDetailFII] = useState<FormattedFII | null>(null);

  const handleAddFII = (symbol: string) => {
    onAddFII(symbol);
    setSearchValue('');
  };

  const handleRemoveFII = (symbol: string) => {
    onRemoveFII(symbol);
  };

  const handleFIICardClick = (fii: FormattedFII) => {
    setSelectedDetailFII(fii);
    onFIIDetailClick?.(fii);
  };

  const handleDetailViewClose = () => {
    setSelectedDetailFII(null);
  };

  const handleDetailViewRefresh = async () => {
    // Refresh data for the currently selected FII
    await refresh();
  };

  const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-white';
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const headerBg = theme === 'dark' ? 'bg-blue-900 bg-opacity-50 text-blue-100' : 'bg-blue-100 text-blue-900';

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className={`text-4xl font-bold ${textColor} mb-4`}>FII Dashboard</h1>
          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <div className="w-full sm:flex-1">
              <SearchInput
                value={searchValue}
                onChange={setSearchValue}
                onSelect={handleAddFII}
              />
            </div>
            {/* Subtask 4: Wire refresh button to hook.refresh() */}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
              aria-label="Refresh FII data"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Selected FIIs Tags */}
          {selectedFIIs.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedFIIs.map((symbol) => (
                <div
                  key={symbol}
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    theme === 'dark'
                      ? 'bg-blue-900 text-blue-100'
                      : 'bg-blue-100 text-blue-900'
                  }`}
                >
                  {symbol}
                  <button
                    onClick={() => handleRemoveFII(symbol)}
                    className="ml-1 hover:font-bold"
                    title={`Remove ${symbol}`}
                    aria-label={`Remove ${symbol} from dashboard`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Subtask 2: Bind LoadingState, ErrorState, EmptyState to hook state (isLoading, error, isEmpty) */}

        {/* Loading State - bound to hook.isLoading */}
        {isLoading && !Object.keys(fiiData).length && (
          <div className="mb-6">
            <LoadingState />
          </div>
        )}

        {/* Error State - bound to hook.error */}
        {error && (
          <div className="mb-6">
            <ErrorState error={error} onRetry={refresh} />
          </div>
        )}

        {/* Empty State - bound to hook.isEmpty */}
        {isEmpty && !isLoading && (
          <div className="mb-6">
            <EmptyState />
          </div>
        )}

        {/* Subtask 3: Bind FII cards to hook data with pretty-printed formatting */}

        {/* FII Cards Grid - bound to hook.data with pretty-printed formatting */}
        {!isEmpty && Object.keys(fiiData).length > 0 && (
          <>
            {/* Loading overlay when refreshing */}
            {isLoading && (
              <div className={`mb-6 p-4 rounded-lg ${headerBg}`}>
                Updating FII data...
              </div>
            )}

            {/* 
              Responsive grid layout:
              - Mobile (<768px): 1 column (grid-cols-1)
              - Tablet (768-1024px): 2 columns (md:grid-cols-2)
              - Desktop (>1024px): 3+ columns (lg:grid-cols-3)
            */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(fiiData).map((fii) => {
                // Pretty-print FII data for display with formatted metrics
                // Uses FIIPrettyPrinter to format currency, percentages, and ratios
                const formattedFII = FIIPrettyPrinter.prettyPrintFII({
                  symbol: fii.symbol,
                  price: fii.price,
                  nav: fii.nav,
                  pvRatio: fii.pvRatio,
                  dividendYield1Month: fii.dividendYield1Month,
                  dividendYield12Month: fii.dividendYield12Month,
                  monthlyReturn: fii.monthlyReturn,
                  investorCount: fii.investorCount,
                  totalAssets: fii.totalAssets,
                  administrator: fii.administrator,
                });

                return (
                  <div
                    key={fii.symbol}
                    onClick={() => handleFIICardClick(formattedFII)}
                    className="cursor-pointer"
                  >
                    <FIICard fii={formattedFII} />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Detail View Modal */}
        {selectedDetailFII && (
          <FIIDetailView
            fii={selectedDetailFII}
            isOpen={!!selectedDetailFII}
            onClose={handleDetailViewClose}
          />
        )}
      </div>
    </div>
  );
}
