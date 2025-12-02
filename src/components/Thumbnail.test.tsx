import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Thumbnail from './Thumbnail';

describe('Thumbnail', () => {
  it('renders placeholder when no src is provided', () => {
    render(<Thumbnail className="thumb" blankClassName="blank" />);
    const placeholder = screen.getByText(/blank/i);
    expect(placeholder).toBeInTheDocument();
    expect(placeholder.parentElement?.className).toContain('blank');
  });

  it('renders an image when src is provided', () => {
    render(<Thumbnail src="/img.png" alt="Preview" className="thumb" />);
    const img = screen.getByRole('img', { name: /preview/i });
    expect(img).toHaveAttribute('src', '/img.png');
  });
});
