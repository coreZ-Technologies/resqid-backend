// src/reliability/circuitBreaker.js

/**
 * Circuit Breaker — 3 states:
 *
 * CLOSED   → everything normal, requests go through
 * OPEN     → too many failures, requests blocked immediately (fail fast)
 * HALF_OPEN → cooldown passed, allow one test request through
 *             if it succeeds → back to CLOSED
 *             if it fails    → back to OPEN
 */

const STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5; // failures before opening
    this.cooldownMs = options.cooldownMs || 30000; // 30s before half-open
    this.onStateChange = options.onStateChange || (() => {});

    this.state = STATE.CLOSED;
    this.failureCount = 0;
    this.lastFailedAt = null;
  }

  async fire(fn) {
    if (this.state === STATE.OPEN) {
      const elapsed = Date.now() - this.lastFailedAt;

      if (elapsed < this.cooldownMs) {
        throw new Error(
          `Circuit is OPEN — service unavailable. Retry in ${Math.ceil((this.cooldownMs - elapsed) / 1000)}s`
        );
      }

      // Cooldown passed — try one request
      this._setState(STATE.HALF_OPEN);
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    this._setState(STATE.CLOSED);
  }

  _onFailure() {
    this.failureCount++;
    this.lastFailedAt = Date.now();

    if (this.failureCount >= this.failureThreshold || this.state === STATE.HALF_OPEN) {
      this._setState(STATE.OPEN);
    }
  }

  _setState(newState) {
    if (this.state !== newState) {
      this.onStateChange(this.state, newState);
      this.state = newState;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailedAt: this.lastFailedAt,
    };
  }
}
