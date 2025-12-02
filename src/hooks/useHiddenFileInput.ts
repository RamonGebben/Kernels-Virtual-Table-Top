'use client';

import { useCallback, useRef, type ChangeEventHandler } from 'react';

type FileHandler = (file: File | null) => void;

/**
 * Provides a hidden file input and helpers to trigger it from any UI element.
 * Keeps the file input reset after each selection so the same file can be re-uploaded.
 */
export const useHiddenFileInput = (onSelect: FileHandler) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    event => {
      const file = event.target.files?.[0] ?? null;
      onSelect(file);
      // Reset value to allow selecting the same file twice.
      event.target.value = '';
    },
    [onSelect],
  );

  return { inputRef, openPicker, handleChange };
};

export default useHiddenFileInput;
