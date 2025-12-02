import '@testing-library/jest-dom/vitest';

class ResizeObserver {
  observe() {
    // no-op
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
}

if (!globalThis.ResizeObserver) {
  // jsdom does not implement ResizeObserver, stub it for canvas tests
  // Cast to any to avoid type mismatch when stubbing global
  (
    globalThis as unknown as { ResizeObserver: typeof ResizeObserver }
  ).ResizeObserver = ResizeObserver;
}
