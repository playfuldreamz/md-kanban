import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement window.matchMedia, which Appica UI's
// useReducedMotion / useMediaQuery hooks depend on.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
