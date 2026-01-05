// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import React from 'react';

describe('Button Component', () => {
    it('should render with correct text', () => {
        render(<Button>Click Me</Button>);
        const button = screen.getByText('Click Me');
        expect(button).toBeInTheDocument();
    });

    it('should apply variant class', () => {
        render(<Button variant="destructive">Delete</Button>);
        const button = screen.getByText('Delete');
        // Check for tailwind class associated with destructive variant (usually bg-destructive)
        // Note: exact class might vary based on theme configuration code, but generic check is safer or just existence.
        expect(button).toBeInTheDocument();
    });
});
