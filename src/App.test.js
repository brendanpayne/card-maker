import { render, screen, fireEvent, act } from '@testing-library/react';
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

test('the number field only accepts up to four digits', () => {
  render(<App />);
  const numberInput = screen.getByLabelText('Number');
  fireEvent.change(numberInput, { target: { value: '1e-2345' } });
  expect(numberInput).toHaveValue('1234');
});

test('restores a saved draft instead of the sample card', () => {
  localStorage.setItem('card-draft', JSON.stringify({
    name: 'Good Boy', number: '7', group: 'rat', type: 'passive', description: 'Fetch.', imageSource: 'sample',
  }));
  render(<App />);
  expect(screen.getByRole('heading', { name: '7 - Good Boy' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Rat' })).toBeChecked();
});

test('autosaves edits to the draft', () => {
  jest.useFakeTimers();
  try {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Autosaved' } });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(JSON.parse(localStorage.getItem('card-draft')).name).toBe('Autosaved');
  } finally {
    jest.useRealTimers();
  }
});

test('start fresh clears the card and can be undone', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start fresh' }));
  expect(screen.getByLabelText(/name/i)).toHaveValue('');
  expect(screen.getByText('No doggo yet.', { exact: false })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByRole('heading', { name: '382 - Scarlet Police' })).toBeInTheDocument();
});

test('after a download, next card keeps the group and type and bumps the number', async () => {
  html2canvas.mockImplementation(() => Promise.resolve({ toBlob: (callback) => callback(new Blob(['png'])) }));
  URL.createObjectURL = jest.fn(() => 'blob:card');
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  render(<App />);
  fireEvent.click(screen.getByRole('radio', { name: 'Pit' }));
  fireEvent.click(screen.getByRole('button', { name: /download your epic dog card/i }));
  fireEvent.click(await screen.findByRole('button', { name: 'Next card (#383)' }));

  expect(screen.getByLabelText('Number')).toHaveValue('383');
  expect(screen.getByLabelText(/name/i)).toHaveValue('');
  expect(screen.getByRole('radio', { name: 'Pit' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Active Card' })).toBeChecked();
});
