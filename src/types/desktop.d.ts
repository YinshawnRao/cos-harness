export {};

declare global {
  interface Window {
    cosHarness?: {
      isDesktop: true;
      platform: NodeJS.Platform;
      windowControls: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
      };
    };
  }
}
