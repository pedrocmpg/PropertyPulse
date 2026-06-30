import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  describe('NoSelection variant (default)', () => {
    it('renders empty state heading for no selection', () => {
      render(<EmptyState />);

      expect(screen.getByText('No FIIs Selected')).toBeInTheDocument();
    });

    it('renders main message for no selection', () => {
      render(<EmptyState />);

      expect(screen.getByText('Select FIIs to display on your dashboard')).toBeInTheDocument();
    });

    it('renders getting started section', () => {
      render(<EmptyState />);

      expect(screen.getByText('How to get started:')).toBeInTheDocument();
    });

    it('displays example FII symbols', () => {
      render(<EmptyState />);

      expect(screen.getByText(/MXRF11/)).toBeInTheDocument();
      expect(screen.getByText(/HGLG11/)).toBeInTheDocument();
      expect(screen.getByText(/KNSC11/)).toBeInTheDocument();
    });

    it('displays FII names in suggestions', () => {
      render(<EmptyState />);

      expect(screen.getByText(/Maxi Renda Fixa Imobiliário/)).toBeInTheDocument();
      expect(screen.getByText(/CSHG Seguridade Imobiliário/)).toBeInTheDocument();
      expect(screen.getByText(/Kinea Sustentabilidade Imobiliário/)).toBeInTheDocument();
    });

    it('displays step-by-step instructions', () => {
      render(<EmptyState />);

      expect(screen.getByText(/Use the search box above/)).toBeInTheDocument();
      expect(screen.getByText(/Click on an FII to add it/)).toBeInTheDocument();
      expect(screen.getByText(/Your selections will be saved/)).toBeInTheDocument();
    });
  });

  describe('NoSearchResults variant', () => {
    it('renders heading for no search results', () => {
      render(<EmptyState type="noSearchResults" />);

      expect(screen.getByText('No FIIs Found')).toBeInTheDocument();
    });

    it('renders message for no search results', () => {
      render(<EmptyState type="noSearchResults" />);

      expect(screen.getByText('No FIIs found matching your search. Try different symbols or search terms.')).toBeInTheDocument();
    });

    it('includes search query in message when provided', () => {
      render(<EmptyState type="noSearchResults" searchQuery="XYZ99" />);

      expect(screen.getByText(/No FIIs found matching your search for "XYZ99"/)).toBeInTheDocument();
    });

    it('shows "Try searching for" guidance section', () => {
      render(<EmptyState type="noSearchResults" />);

      expect(screen.getByText('Try searching for:')).toBeInTheDocument();
    });

    it('displays example symbols for search results', () => {
      render(<EmptyState type="noSearchResults" />);

      expect(screen.getByText(/MXRF11/)).toBeInTheDocument();
      expect(screen.getByText(/HGLG11/)).toBeInTheDocument();
      expect(screen.getByText(/KNSC11/)).toBeInTheDocument();
    });

    it('includes partial search suggestion', () => {
      render(<EmptyState type="noSearchResults" />);

      expect(screen.getByText(/Use partial symbols like/)).toBeInTheDocument();
    });
  });

  describe('Common features', () => {
    it('displays footer information', () => {
      render(<EmptyState />);

      expect(screen.getByText(/Real-time FII data powered by brAPI/)).toBeInTheDocument();
    });

    it('renders icon element', () => {
      const { container } = render(<EmptyState />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('displays guidance in organized list format', () => {
      const { container } = render(<EmptyState />);

      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBeGreaterThan(0);
    });

    it('has accessible heading structure', () => {
      render(<EmptyState />);

      const mainHeading = screen.getByText('No FIIs Selected');
      expect(mainHeading.tagName).toBe('H2');

      const subHeading = screen.getByText('How to get started:');
      expect(subHeading.tagName).toBe('H3');
    });

    it('has proper center alignment and spacing', () => {
      const { container } = render(<EmptyState />);

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toHaveClass('mx-auto', 'py-12');

      const innerDiv = outerDiv.querySelector('div');
      expect(innerDiv).toHaveClass('text-center');
    });

    it('applies dark mode styling (Requirement 11.1)', () => {
      const { container } = render(<EmptyState />);

      const elements = container.querySelectorAll('.text-white, .text-gray-300, .bg-gray-800');
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});

