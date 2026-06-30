/**
 * useUserPreferences React Hook
 * Custom hook for managing user preferences with localStorage persistence
 *
 * The hook maintains state for:
 * - selectedFIIs: Array of FII symbols the user has selected
 * - theme: 'dark' or 'light' theme preference
 * - refreshInterval: Milliseconds between automatic data refreshes
 * - selectedMetrics: Array of metric names to display
 *
 * Features:
 * - Persists preferences to localStorage with key 'fiiDashboard_preferences'
 * - Restores preferences from localStorage on mount
 * - Automatically saves to localStorage on any state change
 * - Provides clearPreferences() to reset all preferences
 *
 * @example
 * const { selectedFIIs, theme, refreshInterval, selectedMetrics, addFII, removeFII, setTheme, savePreferences, clearPreferences } = useUserPreferences();
 *
 * // Add a new FII
 * addFII('MXRF11');
 *
 * // Change theme
 * setTheme('dark');
 *
 * // Clear all preferences
 * clearPreferences();
 */

import { useState, useCallback, useEffect } from 'react';

// User preferences interface
export interface UserPreferences {
  selectedFIIs: string[];
  theme: 'dark' | 'light';
  refreshInterval: number; // milliseconds
  selectedMetrics: string[];
}

// Hook return type
export interface useUserPreferencesReturn extends UserPreferences {
  // FII management
  addFII: (symbol: string) => void;
  removeFII: (symbol: string) => void;
  
  // Theme management
  setTheme: (theme: 'dark' | 'light') => void;
  
  // Interval management
  setRefreshInterval: (interval: number) => void;
  
  // Metrics management
  setSelectedMetrics: (metrics: string[]) => void;
  
  // Persistence
  savePreferences: () => void;
  clearPreferences: () => void;
}

// Storage key constant
const STORAGE_KEY = 'fiiDashboard_preferences';

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  selectedFIIs: [],
  theme: 'dark',
  refreshInterval: 300000, // 5 minutes
  selectedMetrics: ['price', 'yield', 'pvRatio', 'monthlyReturn'],
};

/**
 * Custom React hook for managing user preferences with localStorage
 *
 * @returns Hook return object with preferences state and setter functions
 */
export function useUserPreferences(): useUserPreferencesReturn {
  const [selectedFIIs, setSelectedFIIs] = useState<string[]>([]);
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [refreshInterval, setRefreshIntervalState] = useState<number>(300000);
  const [selectedMetrics, setSelectedMetricsState] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  /**
   * Load preferences from localStorage on mount
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserPreferences;
        setSelectedFIIs(parsed.selectedFIIs || DEFAULT_PREFERENCES.selectedFIIs);
        setThemeState(parsed.theme || DEFAULT_PREFERENCES.theme);
        setRefreshIntervalState(parsed.refreshInterval || DEFAULT_PREFERENCES.refreshInterval);
        setSelectedMetricsState(
          parsed.selectedMetrics || DEFAULT_PREFERENCES.selectedMetrics,
        );
      } else {
        // Initialize with defaults
        setSelectedFIIs(DEFAULT_PREFERENCES.selectedFIIs);
        setThemeState(DEFAULT_PREFERENCES.theme);
        setRefreshIntervalState(DEFAULT_PREFERENCES.refreshInterval);
        setSelectedMetricsState(DEFAULT_PREFERENCES.selectedMetrics);
      }
    } catch (error) {
      console.error('Error loading preferences from localStorage:', error);
      // Fall back to defaults on error
      setSelectedFIIs(DEFAULT_PREFERENCES.selectedFIIs);
      setThemeState(DEFAULT_PREFERENCES.theme);
      setRefreshIntervalState(DEFAULT_PREFERENCES.refreshInterval);
      setSelectedMetricsState(DEFAULT_PREFERENCES.selectedMetrics);
    }
    setIsInitialized(true);
  }, []);

  /**
   * Save preferences to localStorage
   * Called whenever preferences change
   */
  const savePreferences = useCallback(() => {
    try {
      const preferences: UserPreferences = {
        selectedFIIs,
        theme,
        refreshInterval,
        selectedMetrics,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences to localStorage:', error);
    }
  }, [selectedFIIs, theme, refreshInterval, selectedMetrics]);

  /**
   * Clear all preferences and reset to defaults
   */
  const clearPreferences = useCallback(() => {
    try {
      setIsClearing(true);
      localStorage.removeItem(STORAGE_KEY);
      setSelectedFIIs(DEFAULT_PREFERENCES.selectedFIIs);
      setThemeState(DEFAULT_PREFERENCES.theme);
      setRefreshIntervalState(DEFAULT_PREFERENCES.refreshInterval);
      setSelectedMetricsState(DEFAULT_PREFERENCES.selectedMetrics);
      // Reset clearing flag after state updates are batched
      setTimeout(() => setIsClearing(false), 0);
    } catch (error) {
      console.error('Error clearing preferences from localStorage:', error);
      setIsClearing(false);
    }
  }, []);

  /**
   * Auto-save preferences when any state changes (after initialization)
   * Skip if clearing is in progress to avoid re-saving defaults
   */
  useEffect(() => {
    if (isInitialized && !isClearing) {
      savePreferences();
    }
  }, [selectedFIIs, theme, refreshInterval, selectedMetrics, isInitialized, isClearing, savePreferences]);

  /**
   * Add an FII to selected list (no duplicates)
   */
  const addFII = useCallback((symbol: string) => {
    setSelectedFIIs((prev) => {
      if (prev.includes(symbol)) {
        return prev;
      }
      return [...prev, symbol];
    });
  }, []);

  /**
   * Remove an FII from selected list
   */
  const removeFII = useCallback((symbol: string) => {
    setSelectedFIIs((prev) => prev.filter((s) => s !== symbol));
  }, []);

  /**
   * Set theme preference
   */
  const setTheme = useCallback((newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
  }, []);

  /**
   * Set refresh interval
   */
  const setRefreshInterval = useCallback((interval: number) => {
    if (interval > 0) {
      setRefreshIntervalState(interval);
    }
  }, []);

  /**
   * Set selected metrics
   */
  const setSelectedMetrics = useCallback((metrics: string[]) => {
    setSelectedMetricsState(metrics);
  }, []);

  return {
    // Preferences state
    selectedFIIs,
    theme,
    refreshInterval,
    selectedMetrics,
    
    // Setters
    addFII,
    removeFII,
    setTheme,
    setRefreshInterval,
    setSelectedMetrics,
    
    // Persistence
    savePreferences,
    clearPreferences,
  };
}
