/**
 * Tests for Logger utility
 * Validates logging functions for API requests, cache operations, and errors
 */

import Logger from './Logger';

describe('Logger', () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleDebug: typeof console.debug;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleError: typeof console.error;
  let logOutput: string[];

  beforeEach(() => {
    logOutput = [];

    // Mock console methods
    originalConsoleLog = console.log;
    originalConsoleDebug = console.debug;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    console.log = jest.fn((msg) => logOutput.push(String(msg)));
    console.debug = jest.fn((msg) => logOutput.push(String(msg)));
    console.warn = jest.fn((msg) => logOutput.push(String(msg)));
    console.error = jest.fn((msg) => logOutput.push(String(msg)));

    // Reset logger to default state
    Logger.setLevel('info');
    Logger.clearDeduplicationMap();
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsoleLog;
    console.debug = originalConsoleDebug;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('Basic logging methods', () => {
    it('should log debug messages when log level is debug', () => {
      Logger.setLevel('debug');
      Logger.debug('Debug message');
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('DEBUG');
      expect(logOutput[0]).toContain('Debug message');
    });

    it('should not log debug messages when log level is info', () => {
      Logger.setLevel('info');
      Logger.debug('Debug message');
      expect(logOutput.length).toBe(0);
    });

    it('should log info messages', () => {
      Logger.setLevel('info');
      Logger.info('Info message');
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('INFO');
      expect(logOutput[0]).toContain('Info message');
    });

    it('should log warning messages', () => {
      Logger.setLevel('info');
      Logger.warn('Warning message');
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('WARNING');
      expect(logOutput[0]).toContain('Warning message');
    });

    it('should log error messages', () => {
      Logger.setLevel('error');
      Logger.error('Error message');
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('ERROR');
      expect(logOutput[0]).toContain('Error message');
    });
  });

  describe('Structured data logging', () => {
    it('should log info with structured data', () => {
      Logger.setLevel('info');
      Logger.infoData('User action', { userId: 123, action: 'login' });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('INFO');
      expect(logOutput[0]).toContain('User action');
      expect(logOutput[0]).toContain('userId');
      expect(logOutput[0]).toContain('123');
    });

    it('should log debug with structured data', () => {
      Logger.setLevel('debug');
      Logger.debugData('Debug info', { value: 42, status: 'active' });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('DEBUG');
      expect(logOutput[0]).toContain('Debug info');
      expect(logOutput[0]).toContain('value');
    });

    it('should log warning with structured data', () => {
      Logger.setLevel('info');
      Logger.warnData('Warning info', { code: 'DEPRECATED', details: 'old API' });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('WARNING');
      expect(logOutput[0]).toContain('Warning info');
      expect(logOutput[0]).toContain('DEPRECATED');
    });

    it('should log error with structured data', () => {
      Logger.setLevel('error');
      Logger.errorData('Error info', { errorCode: 'ERR_001', severity: 'high' });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('ERROR');
      expect(logOutput[0]).toContain('Error info');
      expect(logOutput[0]).toContain('ERR_001');
    });
  });

  describe('API request logging', () => {
    it('should log API request with all fields', () => {
      Logger.setLevel('info');
      Logger.logAPIRequest({
        requestId: 'req-123',
        method: 'GET',
        path: '/api/fii/indicators',
        query: { symbols: 'MXRF11,HGLG11' },
        statusCode: 200,
        duration: 150,
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('INFO');
      expect(logOutput[0]).toContain('req-123');
      expect(logOutput[0]).toContain('GET');
      expect(logOutput[0]).toContain('/api/fii/indicators');
      expect(logOutput[0]).toContain('200');
      expect(logOutput[0]).toContain('150ms');
    });

    it('should log API request without requestId', () => {
      Logger.setLevel('info');
      Logger.logAPIRequest({
        method: 'POST',
        path: '/api/data',
        statusCode: 201,
        duration: 100,
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('POST');
      expect(logOutput[0]).toContain('201');
    });

    it('should include query parameters in API log', () => {
      Logger.setLevel('info');
      Logger.logAPIRequest({
        method: 'GET',
        path: '/search',
        query: { q: 'MXRF11', limit: 10 },
        statusCode: 200,
        duration: 75,
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('query=');
      expect(logOutput[0]).toContain('MXRF11');
    });
  });

  describe('Cache operation logging', () => {
    it('should log cache hit operation', () => {
      Logger.setLevel('debug');
      Logger.logCacheOperation({
        operation: 'hit',
        symbol: 'MXRF11',
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('DEBUG');
      expect(logOutput[0]).toContain('Cache hit');
      expect(logOutput[0]).toContain('MXRF11');
    });

    it('should log cache miss operation', () => {
      Logger.setLevel('debug');
      Logger.logCacheOperation({
        operation: 'miss',
        symbol: 'HGLG11',
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('Cache miss');
      expect(logOutput[0]).toContain('HGLG11');
    });

    it('should log cache set operation with TTL', () => {
      Logger.setLevel('debug');
      Logger.logCacheOperation({
        operation: 'set',
        symbol: 'KNSC11',
        ttl: 300,
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('Cache set');
      expect(logOutput[0]).toContain('KNSC11');
      expect(logOutput[0]).toContain('ttl=300s');
    });

    it('should log cache delete operation', () => {
      Logger.setLevel('debug');
      Logger.logCacheOperation({
        operation: 'delete',
        symbol: 'BBPO11',
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('Cache delete');
      expect(logOutput[0]).toContain('BBPO11');
    });

    it('should log cache clear operation without symbol', () => {
      Logger.setLevel('debug');
      Logger.logCacheOperation({
        operation: 'clear',
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('Cache clear');
      expect(logOutput[0]).not.toContain('symbol=');
    });
  });

  describe('Error logging', () => {
    it('should log error with code and message', () => {
      Logger.setLevel('error');
      Logger.logError({
        code: 'TIMEOUT',
        message: 'Request timed out',
        statusCode: 504,
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('ERROR');
      expect(logOutput[0]).toContain('TIMEOUT');
      expect(logOutput[0]).toContain('Request timed out');
      expect(logOutput[0]).toContain('504');
    });

    it('should log error with request ID', () => {
      Logger.setLevel('error');
      Logger.logError({
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        statusCode: 429,
        requestId: 'req-456',
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('req-456');
      expect(logOutput[0]).toContain('RATE_LIMITED');
    });

    it('should log error with symbols', () => {
      Logger.setLevel('error');
      Logger.logError({
        code: 'INVALID_DATA',
        message: 'Invalid FII data',
        requestId: 'req-789',
        symbols: ['MXRF11', 'HGLG11'],
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('symbols=');
      expect(logOutput[0]).toContain('MXRF11');
      expect(logOutput[0]).toContain('HGLG11');
    });

    it('should include stack trace in debug mode', () => {
      Logger.setLevel('debug');
      const stackTrace = 'Error: Test error\n    at test.ts:10';
      Logger.logError({
        code: 'TEST_ERROR',
        message: 'Test error occurred',
        stack: stackTrace,
      });
      expect(logOutput.length).toBeGreaterThanOrEqual(2);
      const allOutput = logOutput.join(' ');
      expect(allOutput).toContain('Stack trace');
      expect(allOutput).toContain(stackTrace);
    });

    it('should not include stack trace when not in debug mode', () => {
      Logger.setLevel('error');
      Logger.logError({
        code: 'TEST_ERROR',
        message: 'Test error',
        stack: 'Error: Test\n    at test.ts:10',
      });
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).not.toContain('Stack trace');
    });

    it('should include context in debug mode', () => {
      Logger.setLevel('debug');
      Logger.logError({
        code: 'DB_ERROR',
        message: 'Database error',
        context: { table: 'users', operation: 'select' },
      });
      expect(logOutput.length).toBeGreaterThanOrEqual(2);
      const allOutput = logOutput.join(' ');
      expect(allOutput).toContain('Context');
      expect(allOutput).toContain('table');
    });
  });

  describe('Duplicate error prevention', () => {
    it('should prevent duplicate error logs within 60s window', () => {
      Logger.setLevel('error');
      Logger.clearDeduplicationMap();

      Logger.error('Duplicate error');
      Logger.error('Duplicate error');
      Logger.error('Duplicate error');

      // Only first log should be recorded
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('Duplicate error');
    });

    it('should prevent duplicate errorData logs within 60s window', () => {
      Logger.setLevel('error');
      Logger.clearDeduplicationMap();

      const data = { code: 'ERR001' };
      Logger.errorData('Error occurred', data);
      Logger.errorData('Error occurred', data);
      Logger.errorData('Error occurred', data);

      expect(logOutput.length).toBe(1);
    });

    it('should log different errors separately', () => {
      Logger.setLevel('error');
      Logger.clearDeduplicationMap();

      Logger.error('Error 1');
      Logger.error('Error 2');
      Logger.error('Error 3');

      expect(logOutput.length).toBe(3);
    });
  });

  describe('Log level filtering', () => {
    it('should respect debug log level', () => {
      Logger.setLevel('debug');
      Logger.debug('Debug');
      Logger.info('Info');
      Logger.warn('Warning');
      Logger.error('Error');
      expect(logOutput.length).toBe(4);
    });

    it('should respect info log level', () => {
      Logger.setLevel('info');
      Logger.debug('Debug');
      Logger.info('Info');
      Logger.warn('Warning');
      Logger.error('Error');
      expect(logOutput.length).toBe(3);
    });

    it('should respect warning log level', () => {
      Logger.setLevel('warning');
      Logger.debug('Debug');
      Logger.info('Info');
      Logger.warn('Warning');
      Logger.error('Error');
      expect(logOutput.length).toBe(2);
    });

    it('should respect error log level', () => {
      Logger.setLevel('error');
      Logger.debug('Debug');
      Logger.info('Info');
      Logger.warn('Warning');
      Logger.error('Error');
      expect(logOutput.length).toBe(1);
    });
  });

  describe('Timestamp formatting', () => {
    it('should include ISO timestamp in all logs', () => {
      Logger.setLevel('info');
      Logger.info('Test message');
      expect(logOutput[0]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should format level properly', () => {
      Logger.setLevel('info');
      Logger.debug('Debug');
      Logger.info('Info');
      Logger.warn('Warning');
      Logger.error('Error');

      expect(logOutput[0]).toMatch(/\[INFO\s+\]/);
    });
  });

  describe('Get/Set log level', () => {
    it('should get current log level', () => {
      Logger.setLevel('debug');
      expect(Logger.getLevel()).toBe('debug');

      Logger.setLevel('error');
      expect(Logger.getLevel()).toBe('error');
    });

    it('should change log level dynamically', () => {
      Logger.setLevel('error');
      Logger.info('Not logged');
      expect(logOutput.length).toBe(0);

      Logger.setLevel('info');
      Logger.info('Logged');
      expect(logOutput.length).toBe(1);
    });
  });
});
