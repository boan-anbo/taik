// Shim for fs/promises - not available in React Native
// This file is never actually called, just satisfies Metro bundler

export const readFile = () => {
  throw new Error('fs/promises is not available in React Native');
};

export const writeFile = () => {
  throw new Error('fs/promises is not available in React Native');
};

export const stat = () => {
  throw new Error('fs/promises is not available in React Native');
};

export default {
  readFile,
  writeFile,
  stat,
};
