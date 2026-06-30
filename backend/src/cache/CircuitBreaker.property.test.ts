import * as fc from 'fast-check';
import { CircuitBreaker } from './CircuitBreaker';

/**
 * Property-Based Tests for CircuitBreaker
 * 
 * Property 12: Circuit Breaker on Rate Limit
 * **Validates: Requirements 9.0, 16.1, 16.2**
 * 
 * For any sequence of 429 errors and successful requests, the Circuit Breaker
 * SHALL correctly manage state transitions (CLOSED → OPEN, OPEN → HALF_OPEN, 
 * HALF_OPEN → CLOSED or BACK to OPEN) and respect timing constraints 
 * (60s open duration, 3 test requests in HALF_OPEN).
 */

describe('CircuitBreaker - Property-Based Tests', () => {
  /**
   * Test state transitions with various error and success patterns
   */
  it('should handle sequences of 429 errors correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        async (eventSequence: boolean[]) => {
          const cb = new CircuitBreaker({ openDurationMs: 50, halfOpenTestRequests: 3 });
          
          // eventSequence: true = record success, false = record failure
          
          for (let i = 0; i < eventSequence.length; i++) {
            // Start with a 429 error if we're about to start testing HALF_OPEN
            if (i === 0 || cb.getState() === 'CLOSED') {
              if (eventSequence[i] === false) {
                // Simulate 429 error
                cb.on429Error();
                expect(cb.getState()).toBe('OPEN');
                expect(cb.canAttempt()).toBe(false);
                
                // Wait for HALF_OPEN transition
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
            if (cb.getState() === 'HALF_OPEN') {
              if (eventSequence[i]) {
                cb.recordSuccess();
              } else {
                cb.recordFailure();
                expect(cb.getState()).toBe('OPEN');
              }
            }
          }
          
          // Verify final state is one of the valid states
          const finalState = cb.getState();
          expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(finalState);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Test that canAttempt() always returns correct boolean based on state
   */
  it('should always reflect correct canAttempt() state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (shouldTriggerError: boolean) => {
          const cb = new CircuitBreaker({ openDurationMs: 50 });
          
          if (shouldTriggerError) {
            cb.on429Error();
            expect(cb.canAttempt()).toBe(false);
            expect(cb.getState()).toBe('OPEN');
            
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(cb.canAttempt()).toBe(true);
            expect(cb.getState()).toBe('HALF_OPEN');
          } else {
            expect(cb.canAttempt()).toBe(true);
            expect(cb.getState()).toBe('CLOSED');
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Test that success count doesn't exceed configured threshold
   */
  it('should transition to CLOSED exactly at halfOpenTestRequests threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (testRequests: number) => {
          const cb = new CircuitBreaker({ 
            openDurationMs: 50, 
            halfOpenTestRequests: testRequests 
          });
          
          cb.on429Error();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Record testRequests - 1 successes
          for (let i = 0; i < testRequests - 1; i++) {
            cb.recordSuccess();
            expect(cb.getState()).toBe('HALF_OPEN');
          }
          
          // One more success should transition to CLOSED
          cb.recordSuccess();
          expect(cb.getState()).toBe('CLOSED');
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Test that any failure in HALF_OPEN immediately transitions to OPEN
   */
  it('should immediately transition to OPEN on any failure in HALF_OPEN', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 2 }),
        async (successCount: number) => {
          const cb = new CircuitBreaker({ 
            openDurationMs: 50, 
            halfOpenTestRequests: 3 
          });
          
          cb.on429Error();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Record some successes (but less than threshold)
          for (let i = 0; i < successCount; i++) {
            cb.recordSuccess();
          }
          
          // Failure should transition to OPEN
          cb.recordFailure();
          expect(cb.getState()).toBe('OPEN');
          expect(cb.canAttempt()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Test that recordSuccess/recordFailure in CLOSED state doesn't affect state
   */
  it('should not be affected by success/failure records in CLOSED state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        async (operations: boolean[]) => {
          const cb = new CircuitBreaker();
          
          // In CLOSED state, these operations should not change state
          for (const isSuccess of operations) {
            if (isSuccess) {
              cb.recordSuccess();
            } else {
              cb.recordFailure();
            }
            expect(cb.getState()).toBe('CLOSED');
            expect(cb.canAttempt()).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Test that timing constraints are respected
   */
  it('should respect openDurationMs timing constraint', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 30, max: 200 }),
        async (durationMs: number) => {
          const cb = new CircuitBreaker({ openDurationMs: durationMs });
          
          cb.on429Error();
          const openTime = Date.now();
          
          expect(cb.getState()).toBe('OPEN');
          
          // Wait for state transition
          await new Promise(resolve => setTimeout(resolve, durationMs + 50));
          
          const elapsedMs = Date.now() - openTime;
          expect(cb.getState()).toBe('HALF_OPEN');
          expect(elapsedMs).toBeGreaterThanOrEqual(durationMs);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Test recovery cycle: OPEN → HALF_OPEN → CLOSED
   */
  it('should successfully complete recovery cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (testRequests: number) => {
          const cb = new CircuitBreaker({ 
            openDurationMs: 50, 
            halfOpenTestRequests: testRequests 
          });
          
          // Trigger error
          cb.on429Error();
          expect(cb.getState()).toBe('OPEN');
          
          // Wait for HALF_OPEN
          await new Promise(resolve => setTimeout(resolve, 100));
          expect(cb.getState()).toBe('HALF_OPEN');
          
          // Record successes
          for (let i = 0; i < testRequests; i++) {
            cb.recordSuccess();
          }
          
          // Should be back to CLOSED
          expect(cb.getState()).toBe('CLOSED');
          expect(cb.canAttempt()).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Test multiple recovery attempts with failures
   */
  it('should handle multiple recovery attempts with alternating success/failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        async (recoveryAttempts: boolean[]) => {
          const cb = new CircuitBreaker({ 
            openDurationMs: 50, 
            halfOpenTestRequests: 2 
          });
          
          for (const succeeds of recoveryAttempts) {
            // Trigger error
            cb.on429Error();
            expect(cb.getState()).toBe('OPEN');
            
            // Wait for HALF_OPEN
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(cb.getState()).toBe('HALF_OPEN');
            
            if (succeeds) {
              // Record successes
              cb.recordSuccess();
              cb.recordSuccess();
              expect(cb.getState()).toBe('CLOSED');
            } else {
              // Record failure
              cb.recordFailure();
              expect(cb.getState()).toBe('OPEN');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);
});
