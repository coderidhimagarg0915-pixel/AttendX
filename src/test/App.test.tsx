import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('AttendX App Routing & Landing', () => {
  it('renders landing page with portal options', () => {
    render(<App />);
    expect(screen.getAllByText(/AttendX/i)[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Faculty Portal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Student Portal/i })).toBeInTheDocument();
  });
});
