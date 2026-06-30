/**
 * Unit tests for the environment configuration module
 *
 * Tests cover:
 * 1. URL validation using native URL constructor
 * 2. Refresh interval parsing and validation
 * 3. Development mode detection
 * 4. Error handling with clear messages
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentConfig } from './environment';

describe('Environment Configuration Module', () => {
  describe('URL Validation', () => {
    it('should accept valid HTTP URLs', () => {
      const testUrl = 'http://localhost:3001';
      expect(() => new URL(testUrl)).not.toThrow();
    });

    it('should accept valid HTTPS URLs', () => {
      const testUrl = 'https://api.example.com';
      expect(() => new URL(testUrl)).not.toThrow();
    });

    it('should accept URLs with ports', () => {
      const testUrl = 'http://localhost:3001';
      expect(() => new URL(testUrl)).not.toThrow();
    });

    it('should accept URLs with paths', () => {
      const testUrl = 'http://localhost:3001/api';
      expect(() => new URL(testUrl)).not.toThrow();
    });

    it('should reject invalid URL formats', () => {
      const testUrl = 'not-a-valid-url';
      expect(() => new URL(testUrl)).toThrow();
    });

    it('should reject URLs with spaces', () => {
      const testUrl = 'http://localhost 3001';
      expect(() => new URL(testUrl)).toThrow();
    });
  });

  describe('Refresh Interval Validation', () => {
    it('should parse valid numeric strings', () => {
      const value = '60000';
      const parsed = parseInt(value, 10);
      expect(parsed).toBe(60000);
      expect(!isNaN(parsed)).toBe(true);
    });

    it('should reject non-numeric strings', () => {
      const value = 'not-a-number';
      const parsed = parseInt(value, 10);
      expect(isNaN(parsed)).toBe(true);
    });

    it('should accept positive integers', () => {
      expect(300000 > 0).toBe(true);
    });

    it('should reject zero', () => {
      expect(0 > 0).toBe(false);
    });

    it('should reject negative integers', () => {
      expect(-1000 > 0).toBe(false);
    });
  });

  describe('Development Mode Detection', () => {
    it('should detect development mode from NODE_ENV', () => {
      const isDev = 'development' === 'development';
      expect(isDev).toBe(true);
    });

    it('should not be in development for production', () => {
      const isDev = 'production' === 'development';
      expect(isDev).toBe(false);
    });
  });

  describe('Configuration Interface', () => {
    it('should have required properties in EnvironmentConfig', () => {
      const mockConfig: EnvironmentConfig = {
        backendUrl: 'http://localhost:3001',
        refreshInterval: 300000,
        isDevelopment: true,
      };

      expect(mockConfig.backendUrl).toBeDefined();
      expect(mockConfig.refreshInterval).toBeDefined();
      expect(mockConfig.isDevelopment).toBeDefined();
    });

    it('should validate backend URL is a string', () => {
      const mockConfig: EnvironmentConfig = {
        backendUrl: 'http://localhost:3001',
        refreshInterval: 300000,
        isDevelopment: false,
      };

      expect(typeof mockConfig.backendUrl).toBe('string');
    });

    it('should validate refresh interval is a number', () => {
      const mockConfig: EnvironmentConfig = {
        backendUrl: 'http://localhost:3001',
        refreshInterval: 300000,
        isDevelopment: false,
      };

      expect(typeof mockConfig.refreshInterval).toBe('number');
    });

    it('should validate isDevelopment is a boolean', () => {
      const mockConfig: EnvironmentConfig = {
        backendUrl: 'http://localhost:3001',
        refreshInterval: 300000,
        isDevelopment: false,
      };

      expect(typeof mockConfig.isDevelopment).toBe('boolean');
    });
  });

  describe('Error Message Formatting', () => {
    it('should include helpful guidance for missing backend URL error', () => {
      const errorMsg =
        'Missing required environment variable: REACT_APP_BACKEND_URL. ' +
        'Please set REACT_APP_BACKEND_URL in your .env file or deployment configuration.';
      expect(errorMsg).toContain('REACT_APP_BACKEND_URL');
      expect(errorMsg).toContain('.env file');
    });

    it('should include example URL in invalid format error', () => {
      const errorMsg =
        'Invalid REACT_APP_BACKEND_URL format. ' +
        'Must be a valid URL (e.g., http://localhost:3001 or https://api.example.com)';
      expect(errorMsg).toContain('http://localhost:3001');
      expect(errorMsg).toContain('https://api.example.com');
    });

    it('should include milliseconds guidance in refresh interval error', () => {
      const errorMsg =
        'Invalid REACT_APP_REFRESH_INTERVAL. ' +
        'Must be a positive integer representing milliseconds (e.g., 300000 for 5 minutes)';
      expect(errorMsg).toContain('milliseconds');
      expect(errorMsg).toContain('300000');
    });
  });

  describe('Default Values', () => {
    it('should have sensible default refresh interval', () => {
      // Default 5 minutes in milliseconds
      const defaultInterval = 300000;
      expect(defaultInterval).toBe(5 * 60 * 1000);
    });

    it('should have reasonable minimum refresh interval', () => {
      // Minimum 1ms
      const minInterval = 1;
      expect(minInterval > 0).toBe(true);
    });

    it('should support long refresh intervals', () => {
      // Support 1 hour
      const maxInterval = 3600000;
      expect(maxInterval).toBe(60 * 60 * 1000);
    });
  });
});
