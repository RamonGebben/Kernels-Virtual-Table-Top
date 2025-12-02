import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useHiddenFileInput } from './useHiddenFileInput';

describe('useHiddenFileInput', () => {
  it('triggers the hidden input and forwards selected files', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() => useHiddenFileInput(onSelect));
    const input = document.createElement('input');
    const clickSpy = vi.spyOn(input, 'click');

    act(() => {
      result.current.inputRef.current = input;
    });

    act(() => {
      result.current.openPicker();
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);

    const file = new File(['file'], 'image.png', { type: 'image/png' });
    const event = {
      target: {
        files: [file],
        value: 'has-value',
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleChange(event);
    });

    expect(onSelect).toHaveBeenCalledWith(file);
    expect(event.target.value).toBe('');
  });
});
