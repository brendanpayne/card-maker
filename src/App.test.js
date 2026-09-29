import { render, screen, fireEvent } from '@testing-library/react';
import html2canvas from 'html2canvas';
import App from './App';

jest.mock('html2canvas');

// CRA resets mock implementations before each test, so set it here.
// A promise that never settles keeps the download in its "rendering" state.
beforeEach(() => {
  html2canvas.mockImplementation(() => new Promise(() => {}));
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete window.matchMedia;
});

const mockDeviceTheme = (dark) => {
  window.matchMedia = jest.fn(() => ({
    matches: dark,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
};

test('defaults to the device theme', () => {
  mockDeviceTheme(true);
  render(<App />);
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
});

test('toggling the theme saves the choice', () => {
  mockDeviceTheme(false);
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem('theme')).toBe('dark');
});

test('a saved theme overrides the device theme', () => {
  mockDeviceTheme(true);
  localStorage.setItem('theme', 'light');
  render(<App />);
  expect(document.documentElement.dataset.theme).toBe('light');
});

test('renders the default card preview and download button', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '382 - Scarlet Police' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /download your epic dog card/i })).toBeInTheDocument();
});

test('pressing Enter in a field does not download the card', () => {
  render(<App />);
  const nameInput = screen.getByLabelText(/name/i);
  fireEvent.keyDown(nameInput, { key: 'Enter', code: 'Enter' });
  fireEvent.submit(nameInput.closest('form'));
  expect(html2canvas).not.toHaveBeenCalled();
});

test('shows a busy state while the card renders and ignores repeat clicks', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /download your epic dog card/i }));
  const button = await screen.findByRole('button', { name: /rendering/i });
  // aria-disabled rather than disabled, so keyboard focus stays on the button.
  expect(button).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(button);
  expect(html2canvas).toHaveBeenCalledTimes(1);
});

test('picking a group chip updates the card in that group colour', () => {
  render(<App />);
  expect(screen.getByRole('radio', { name: 'Basic' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: 'Bushido' }));
  const groupLine = document.querySelector('.card-group');
  expect(groupLine).toHaveTextContent('Bushido');
  expect(groupLine).toHaveStyle({ color: '#1B8031' });
});

test('ignores a cancelled file picker', () => {
  render(<App />);
  const fileInput = screen.getByLabelText(/image/i);
  expect(() => fireEvent.change(fileInput, { target: { files: [] } })).not.toThrow();
});
