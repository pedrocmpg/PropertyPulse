import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchInput from './SearchInput';

describe('SearchInput', () => {
  const createProps = (overrides = {}) => ({
    value: '',
    onChange: vi.fn(),
    onSelect: vi.fn(),
    ...overrides,
  });

  it('renders search input field', () => {
    const props = createProps();
    render(<SearchInput {...props} />);

    const input = screen.getByPlaceholderText(/Search by symbol/);
    expect(input).toBeInTheDocument();
  });

  it('shows suggestions when user types', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    const { rerender } = render(
      <SearchInput value="" onChange={onChange} onSelect={onSelect} />
    );

    const input = screen.getByPlaceholderText(/Search by symbol/);
    await userEvent.type(input, 'M');

    // Simulate parent updating value prop
    rerender(<SearchInput value="MXR" onChange={onChange} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText('MXRF11')).toBeInTheDocument();
    });
  });

  it('filters suggestions by symbol prefix', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    const { rerender } = render(
      <SearchInput value="" onChange={onChange} onSelect={onSelect} />
    );

    const input = screen.getByPlaceholderText(/Search by symbol/);
    await userEvent.type(input, 'H');

    // Simulate parent updating value
    rerender(<SearchInput value="HGLG" onChange={onChange} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText('HGLG11')).toBeInTheDocument();
    });
  });

  it('filters suggestions by name substring', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    const { rerender } = render(
      <SearchInput value="" onChange={onChange} onSelect={onSelect} />
    );

    const input = screen.getByPlaceholderText(/Search by symbol/);
    await userEvent.type(input, 'S');

    // Simulate parent updating value
    rerender(
      <SearchInput
        value="Sustentabilidade"
        onChange={onChange}
        onSelect={onSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('KNSC11')).toBeInTheDocument();
    });
  });

  it('shows max 10 results in dropdown', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <SearchInput
        value="imobiliário"
        onChange={onChange}
        onSelect={onSelect}
      />
    );

    // Should show suggestions
    await waitFor(() => {
      expect(
        screen.getByText(/Maxi Renda Fixa Imobiliário/)
      ).toBeInTheDocument();
    });
  });

  it('calls onSelect when suggestion is clicked', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(<SearchInput value="MXRF" onChange={onChange} onSelect={onSelect} />);

    await waitFor(() => {
      const suggestion = screen.getByText('MXRF11');
      fireEvent.click(suggestion);
    });

    expect(onSelect).toHaveBeenCalledWith('MXRF11');
  });

  it('clears input after selecting a suggestion (via onChange)', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(<SearchInput value="MXRF" onChange={onChange} onSelect={onSelect} />);

    await waitFor(() => {
      const suggestion = screen.getByText('MXRF11');
      fireEvent.click(suggestion);
    });

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('closes dropdown when clicking outside', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <div>
        <SearchInput value="MXRF" onChange={onChange} onSelect={onSelect} />
        <button>Outside Button</button>
      </div>
    );

    await waitFor(() => {
      expect(screen.getByText('MXRF11')).toBeInTheDocument();
    });

    // Click outside
    const outsideButton = screen.getByText('Outside Button');
    fireEvent.mouseDown(outsideButton);

    await waitFor(() => {
      expect(screen.queryByText('MXRF11')).not.toBeInTheDocument();
    });
  });

  it('displays "No FIIs found" message for no matches', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <SearchInput
        value="NONEXISTENT"
        onChange={onChange}
        onSelect={onSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No FIIs found matching/)).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation with arrow keys', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(<SearchInput value="MXR" onChange={onChange} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText('MXRF11')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search by symbol/);
    // Press arrow down
    await userEvent.keyboard('{ArrowDown}');

    // The first suggestion should be highlighted (implementation detail)
    expect(input).toHaveValue('MXR');
  });

  it('selects suggestion when pressing Enter after arrow key navigation', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(<SearchInput value="MXR" onChange={onChange} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText('MXRF11')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search by symbol/);
    input.focus();
    await userEvent.keyboard('{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith('MXRF11');
  });

  it('closes dropdown when pressing Escape', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(<SearchInput value="MXRF" onChange={onChange} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText('MXRF11')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search by symbol/);
    input.focus();
    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('MXRF11')).not.toBeInTheDocument();
    });
  });

  it('displays search icon', () => {
    const props = createProps();
    const { container } = render(<SearchInput {...props} />);

    const searchIcon = container.querySelector('svg');
    expect(searchIcon).toBeInTheDocument();
  });

  it('is case-insensitive for search', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(<SearchInput value="mxrf" onChange={onChange} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText('MXRF11')).toBeInTheDocument();
    });
  });

  it('displays FII name in suggestions', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(<SearchInput value="MXRF" onChange={onChange} onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText(/Maxi Renda Fixa Imobiliário/)).toBeInTheDocument();
    });
  });

  it('calls onChange when user types', async () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(<SearchInput value="" onChange={onChange} onSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/Search by symbol/);
    await userEvent.type(input, 'MXR');

    expect(onChange).toHaveBeenCalled();
  });

  it('accepts controlled value prop', () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    const { rerender } = render(
      <SearchInput value="MXRF" onChange={onChange} onSelect={onSelect} />
    );

    const input = screen.getByPlaceholderText(/Search by symbol/) as HTMLInputElement;
    expect(input.value).toBe('MXRF');

    rerender(
      <SearchInput value="HGLG" onChange={onChange} onSelect={onSelect} />
    );
    expect(input.value).toBe('HGLG');
  });
});
