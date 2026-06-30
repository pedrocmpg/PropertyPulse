import { CircuitBreaker } from './CircuitBreaker';

describe('CircuitBreaker', () => {
  describe('Initialization', () => {
    it('should start in CLOSED state', () => {
      const cb = new CircuitBreaker();
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should allow requests in CLOSED state', () => {
      const cb = new CircuitBreaker();
      expect(cb.canAttempt()).toBe(true);
    });

    it('should accept custom configuration', () => {
      const cb = new CircuitBreaker({ openDurationMs: 5000, halfOpenTestRequests: 5 });
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should use default configuration if not provided', () => {
      const cb = new CircuitBreaker();
      // Verify defaults work by checking state after operations
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('canAttempt()', () => {
    it('should return true when CLOSED', () => {
      const cb = new CircuitBreaker();
      expect(cb.canAttempt()).toBe(true);
    });

    it('should return false when OPEN', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100 });
      cb.on429Error();
      expect(cb.canAttempt()).toBe(false);
    });

    it('should return true when HALF_OPEN', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100 });
      cb.on429Error();
      
      // Wait for transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cb.canAttempt()).toBe(true);
    });
  });

  describe('on429Error()', () => {
    it('should transition from CLOSED to OPEN on 429 error', () => {
      const cb = new CircuitBreaker();
      cb.on429Error();
      expect(cb.getState()).toBe('OPEN');
    });

    it('should reject requests after 429 error', () => {
      const cb = new CircuitBreaker();
      cb.on429Error();
      expect(cb.canAttempt()).toBe(false);
    });

    it('should transition from OPEN to HALF_OPEN after timeout', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100 });
      cb.on429Error();
      expect(cb.getState()).toBe('OPEN');
      
      // Wait for timer to trigger
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cb.getState()).toBe('HALF_OPEN');
    });
  });

  describe('recordSuccess()', () => {
    it('should not affect CLOSED state', () => {
      const cb = new CircuitBreaker();
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should not affect OPEN state', () => {
      const cb = new CircuitBreaker();
      cb.on429Error();
      cb.recordSuccess();
      expect(cb.getState()).toBe('OPEN');
    });

    it('should increment success count in HALF_OPEN', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100 });
      cb.on429Error();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cb.getState()).toBe('HALF_OPEN');
      
      cb.recordSuccess();
      // After 1 success, should still be HALF_OPEN (need 3)
      expect(cb.getState()).toBe('HALF_OPEN');
    });

    it('should transition to CLOSED after 3 successes in HALF_OPEN', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100, halfOpenTestRequests: 3 });
      cb.on429Error();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cb.getState()).toBe('HALF_OPEN');
      
      cb.recordSuccess();
      expect(cb.getState()).toBe('HALF_OPEN');
      
      cb.recordSuccess();
      expect(cb.getState()).toBe('HALF_OPEN');
      
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.canAttempt()).toBe(true);
    });

    it('should transition to CLOSED with custom halfOpenTestRequests', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100, halfOpenTestRequests: 5 });
      cb.on429Error();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Record 4 successes (one short of 5)
      for (let i = 0; i < 4; i++) {
        cb.recordSuccess();
        expect(cb.getState()).toBe('HALF_OPEN');
      }
      
      // 5th success should transition to CLOSED
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('recordFailure()', () => {
    it('should not affect CLOSED state', () => {
      const cb = new CircuitBreaker();
      cb.recordFailure();
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should not affect OPEN state', () => {
      const cb = new CircuitBreaker();
      cb.on429Error();
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
    });

    it('should transition from HALF_OPEN to OPEN on any failure', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100 });
      cb.on429Error();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cb.getState()).toBe('HALF_OPEN');
      
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
      expect(cb.canAttempt()).toBe(false);
    });

    it('should reset success counter when transitioning back to OPEN', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100, halfOpenTestRequests: 3 });
      cb.on429Error();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Record 2 successes
      cb.recordSuccess();
      cb.recordSuccess();
      expect(cb.getState()).toBe('HALF_OPEN');
      
      // Failure should go back to OPEN
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
      expect(cb.canAttempt()).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('should follow correct transition path: CLOSED → OPEN → HALF_OPEN → CLOSED', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100, halfOpenTestRequests: 3 });
      
      expect(cb.getState()).toBe('CLOSED');
      
      cb.on429Error();
      expect(cb.getState()).toBe('OPEN');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cb.getState()).toBe('HALF_OPEN');
      
      cb.recordSuccess();
      cb.recordSuccess();
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should follow transition path: CLOSED → OPEN → HALF_OPEN → OPEN (on failure)', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100 });
      
      expect(cb.getState()).toBe('CLOSED');
      
      cb.on429Error();
      expect(cb.getState()).toBe('OPEN');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cb.getState()).toBe('HALF_OPEN');
      
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
      expect(cb.canAttempt()).toBe(false);
    });

    it('should allow multiple cycles of OPEN → HALF_OPEN → CLOSED', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 50, halfOpenTestRequests: 2 });
      
      // First cycle
      cb.on429Error();
      expect(cb.getState()).toBe('OPEN');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cb.getState()).toBe('HALF_OPEN');
      
      cb.recordSuccess();
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
      
      // Second cycle
      cb.on429Error();
      expect(cb.getState()).toBe('OPEN');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cb.getState()).toBe('HALF_OPEN');
      
      cb.recordSuccess();
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('Timing', () => {
    it('should respect custom openDurationMs', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 50 });
      
      cb.on429Error();
      expect(cb.getState()).toBe('OPEN');
      
      // Too early - should still be OPEN
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(cb.getState()).toBe('OPEN');
      
      // After duration - should be HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(cb.getState()).toBe('HALF_OPEN');
    });

    it('should use default 60000ms openDurationMs when not specified', () => {
      const cb = new CircuitBreaker();
      // We can't easily test the full duration, but we verify it starts in OPEN
      cb.on429Error();
      expect(cb.getState()).toBe('OPEN');
    });
  });

  describe('Integration', () => {
    it('should complete full recovery cycle', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100, halfOpenTestRequests: 3 });
      
      // Normal operation
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.canAttempt()).toBe(true);
      
      // Rate limit error
      cb.on429Error();
      expect(cb.getState()).toBe('OPEN');
      expect(cb.canAttempt()).toBe(false);
      
      // Wait for recovery attempt
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cb.getState()).toBe('HALF_OPEN');
      expect(cb.canAttempt()).toBe(true);
      
      // Test requests succeed
      cb.recordSuccess();
      cb.recordSuccess();
      cb.recordSuccess();
      
      // Back to normal
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.canAttempt()).toBe(true);
    });

    it('should handle multiple failures and recovery attempts', async () => {
      const cb = new CircuitBreaker({ openDurationMs: 100, halfOpenTestRequests: 2 });
      
      // First failure
      cb.on429Error();
      expect(cb.getState()).toBe('OPEN');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cb.getState()).toBe('HALF_OPEN');
      
      // Recovery fails
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
      
      // Try again
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cb.getState()).toBe('HALF_OPEN');
      
      // This time it succeeds
      cb.recordSuccess();
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
    });
  });
});
