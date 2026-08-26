export {};

declare global {
  interface Window {
    cosHarness?: {
      isDesktop: true;
    };
  }
}
