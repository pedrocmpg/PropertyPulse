/**
 * CircuitBreaker class for handling rate limiting (429) errors
 * Implements a state machine with three states: CLOSED, OPEN, HALF_OPEN
 * 
 * CLOSED: Normal operation, all requests allowed
 * OPEN: Circuit broken, requests rejected for 60 seconds (openDurationMs)
 * HALF_OPEN: Testing state, allowing limited requests (halfOpenTestRequests) to check if service recovered
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  openDurationMs?: number;      // Duration to keep circuit open (default: 60000ms)
  halfOpenTestRequests?: number; // Number of test requests allowed in HALF_OPEN (default: 3)
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private openTimer: NodeJS.Timeout | null = null;

  private readonly openDurationMs: number;
  private readonly halfOpenTestRequests: number;

  constructor(config: CircuitBreakerConfig = {}) {
    this.openDurationMs = config.openDurationMs ?? 60000;
    this.halfOpenTestRequests = config.halfOpenTestRequests ?? 3;
  }

  /**
   * Get current circuit breaker state
   */
  public getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if a request attempt is allowed
   * Returns false if circuit is OPEN, true otherwise
   */
  public canAttempt(): boolean {
    return this.state !== 'OPEN';
  }

  /**
   * Record a successful request
   * In HALF_OPEN state: increments success count, transitions to CLOSED after 3 successes
   * In other states: no action
   */
  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      // If we've had enough successes, transition to CLOSED
      if (this.successCount >= this.halfOpenTestRequests) {
        this.transitionToClosed();
      }
    }
  }

  /**
   * Record a failed request
   * In HALF_OPEN state: immediately transitions to OPEN
   * In other states: no action
   */
  public recordFailure(): void {
    if (this.state === 'HALF_OPEN') {
      this.transitionToOpen();
    }
  }

  /**
   * Handle HTTP 429 (Rate Limit) error
   * Immediately transitions to OPEN state
   * Schedules transition to HALF_OPEN after openDurationMs
   */
  public on429Error(): void {
    this.transitionToOpen();
  }

  /**
   * Transition to CLOSED state
   * Resets all counters
   */
  private transitionToClosed(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    
    // Clear any pending timer
    if (this.openTimer) {
      clearTimeout(this.openTimer);
      this.openTimer = null;
    }
  }

  /**
   * Transition to OPEN state
   * Sets a timer to transition to HALF_OPEN after openDurationMs
   */
  private transitionToOpen(): void {
    this.state = 'OPEN';
    this.failureCount++;
    this.successCount = 0;

    // Clear any existing timer
    if (this.openTimer) {
      clearTimeout(this.openTimer);
    }

    // Schedule transition to HALF_OPEN after openDurationMs
    this.openTimer = setTimeout(() => {
      this.transitionToHalfOpen();
    }, this.openDurationMs);
  }

  /**
   * Transition to HALF_OPEN state
   * Allows up to halfOpenTestRequests test requests
   */
  private transitionToHalfOpen(): void {
    this.state = 'HALF_OPEN';
    this.successCount = 0;
    this.failureCount = 0;
    this.openTimer = null;
  }
}
