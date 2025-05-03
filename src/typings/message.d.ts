export type ExtensionMessage = {
  selected?: {
    isPositive: boolean;
    shortPath: string;
    fullPath: string;
    textContent: string;
    innerHTML: string;
    outerHTML: string;
  };
};
