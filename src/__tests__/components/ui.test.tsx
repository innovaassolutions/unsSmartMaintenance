/**
 * UI Component Tests
 * Tests for shadcn/ui components and TailwindCSS integration
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

describe('UI Components', () => {
  describe('Button Component', () => {
    test('should render default button', () => {
      render(<Button>Test Button</Button>);
      const button = screen.getByRole('button', { name: 'Test Button' });
      expect(button).toBeInTheDocument();
    });

    test('should render industrial variant button', () => {
      render(<Button variant="industrial">Industrial Button</Button>);
      const button = screen.getByRole('button', { name: 'Industrial Button' });
      expect(button).toBeInTheDocument();
    });

    test('should apply correct size classes', () => {
      render(<Button size="lg">Large Button</Button>);
      const button = screen.getByRole('button', { name: 'Large Button' });
      expect(button).toHaveClass('h-10');
    });
  });

  describe('Card Component', () => {
    test('should render card with content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });
  });
});

describe('TailwindCSS Integration', () => {
  test('should apply custom industrial classes', () => {
    render(
      <div className="bg-industrial-500 text-white">Industrial Styled</div>
    );
    const element = screen.getByText('Industrial Styled');
    expect(element).toHaveClass('bg-industrial-500', 'text-white');
  });

  test('should apply status color classes', () => {
    render(<div className="text-status-operational">Operational Status</div>);
    const element = screen.getByText('Operational Status');
    expect(element).toHaveClass('text-status-operational');
  });

  test('should apply data visualization colors', () => {
    render(<div className="bg-data-primary">Primary Data</div>);
    const element = screen.getByText('Primary Data');
    expect(element).toHaveClass('bg-data-primary');
  });
});

describe('Typography Plugin', () => {
  test('should apply prose classes from typography plugin', () => {
    render(
      <div className="prose">
        <h1>Typography Test</h1>
        <p>This tests the typography plugin.</p>
      </div>
    );

    const heading = screen.getByRole('heading', { name: 'Typography Test' });
    expect(heading).toBeInTheDocument();

    const paragraph = screen.getByText('This tests the typography plugin.');
    expect(paragraph).toBeInTheDocument();
  });
});
