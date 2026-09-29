import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the default card preview and download button', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '382 - Scarlet Police' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /download your epic dog card/i })).toBeInTheDocument();
});
