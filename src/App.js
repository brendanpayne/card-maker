import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

const CARD_WIDTH = 407;
const CARD_HEIGHT = 584;
const STACKED_BREAKPOINT = 1000;
const PAGE_GUTTER = 16;

const MAX_DESC_FONT_SIZE = 28;
const MIN_DESC_FONT_SIZE = 10;
const MAX_DESC_HEIGHT = 125;

const MAX_NAME_FONT_SIZE = 24;
const MIN_NAME_FONT_SIZE = 10;
const MAX_NAME_WIDTH = 250;

// Shrinks the element's font one pixel at a time from `max` until `fits` passes.
// Returns the chosen size and whether it actually fits at that size.
const fitFontSize = (el, max, min, fits) => {
  let size = max;
  el.style.fontSize = `${size}px`;
  while (size > min && !fits(el)) {
    size -= 1;
    el.style.fontSize = `${size}px`;
  }
  return { size, fits: fits(el) };
};

const THEME_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const readSavedTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
};

const getDeviceTheme = () => (window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light');

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const getPreviewScale = () => {
  if (window.innerWidth >= STACKED_BREAKPOINT) return 1;
  return Math.min(1, (window.innerWidth - PAGE_GUTTER * 2) / CARD_WIDTH);
};

function CardGenerator() {
  const [name, setName] = useState('Scarlet Police');
  const [number, setNumber] = useState(382);
  const [image, setImage] = useState(`${process.env.PUBLIC_URL}/382.jpg`);
  const [description, setDescription] = useState('Choose a player. They must return to their starting tile at the end of their turn until they move a cumulative 9 tiles, at which time this card is destroyed.');
  const [group, setGroup] = useState('᲼᲼');
  const [type, setType] = useState('active');
  const cardRef = useRef(null);

  const [descSize, setDescSize] = useState(MAX_DESC_FONT_SIZE);
  const [descOverflow, setDescOverflow] = useState(false);
  const descriptionRef = useRef(null);

  const [nameSize, setNameSize] = useState(MAX_NAME_FONT_SIZE);
  const [nameOverflow, setNameOverflow] = useState(false);
  const nameRef = useRef(null);

  const [fontsReady, setFontsReady] = useState(false);
  const [previewScale, setPreviewScale] = useState(getPreviewScale);
  const [downloadStatus, setDownloadStatus] = useState('idle');
  const [imageError, setImageError] = useState('');
  const [theme, setTheme] = useState(() => readSavedTheme() ?? getDeviceTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Until the user picks a theme, follow the device setting as it changes.
  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY);
    if (!query) return;
    const handleChange = (event) => {
      if (!readSavedTheme()) setTheme(event.matches ? 'dark' : 'light');
    };
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked (private mode, site data off): the choice lasts for this visit only.
    }
  };

  useEffect(() => {
    if (!document.fonts) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleResize = () => setPreviewScale(getPreviewScale());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Refit after every render that changes the text, and again once web fonts load,
  // so pasted or cleared text lands at the right size immediately.
  useLayoutEffect(() => {
    if (!nameRef.current) return;
    const result = fitFontSize(nameRef.current, MAX_NAME_FONT_SIZE, MIN_NAME_FONT_SIZE,
      (el) => el.clientWidth <= MAX_NAME_WIDTH);
    setNameSize(result.size);
    setNameOverflow(!result.fits);
  }, [name, number, fontsReady]);

  useLayoutEffect(() => {
    if (!descriptionRef.current) return;
    const result = fitFontSize(descriptionRef.current, MAX_DESC_FONT_SIZE, MIN_DESC_FONT_SIZE,
      (el) => el.clientHeight <= MAX_DESC_HEIGHT);
    setDescSize(result.size);
    setDescOverflow(!result.fits);
  }, [description, fontsReady]);

  useEffect(() => {
    if (downloadStatus !== 'saved') return;
    const timer = setTimeout(() => setDownloadStatus('idle'), 3000);
    return () => clearTimeout(timer);
  }, [downloadStatus]);

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError(`"${file.name}" isn't an image. Pick a PNG, JPG, GIF or WebP.`);
      return;
    }
    setImageError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target.result);
    };
    reader.onerror = () => {
      setImageError(`Couldn't read "${file.name}". Try a different image.`);
    };
    reader.readAsDataURL(file);
  };

  const handleGroupChange = (event) => {
    setGroup(event.target.value);
  };

  const handleTypeChange = (event) => {
    setType(event.target.value);
  }

  const handleDownload = async () => {
    if (downloadStatus === 'rendering') return;
    setDownloadStatus('rendering');
    try {
      if (document.fonts) await document.fonts.ready;
      const canvas = await html2canvas(cardRef.current, {
        // The on-screen preview may be scaled down on small screens; export at full size.
        onclone: (clonedDoc) => {
          const scaler = clonedDoc.querySelector('.card-scaler');
          if (scaler) scaler.style.transform = 'none';
          clonedDoc.querySelectorAll('.card-image-empty').forEach((el) => el.remove());
        },
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Canvas export returned no data');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = (name && number) ? `${number} - ${name}.png` : 'card.png';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setDownloadStatus('saved');
    } catch (error) {
      console.error(error);
      setDownloadStatus('error');
    }
  };

  const typeNames = {
    'pre-turn': 'Pre-Turn Card',
    'aod': 'Activate on Draw',
    'board': 'Board Card',
    'active': 'Active Card',
    'passive': 'Passive Card',
  };

  const groupNames = {
    '': 'Basic',
    'otto': 'Otto',
    'bushido': 'Bushido',
    'rat': 'Rat',
    'shop': 'Shop',
    'realm': `Hitler's Realm`,
    'pit': 'Pit',
    'cultist': 'Cultist',
  };

  const downloadLabels = {
    idle: 'Download your epic dog card!!',
    rendering: 'Rendering your masterpiece…',
    saved: 'SAVED!! Go flex on the lads',
    error: 'Download your epic dog card!!',
  };

  const isScaled = previewScale < 1;

  return (
    <div className="container">
      <div
        className="card-container"
        style={isScaled ? { width: CARD_WIDTH * previewScale, height: CARD_HEIGHT * previewScale } : undefined}
      >
        <div className="card-scaler" style={isScaled ? { transform: `scale(${previewScale})` } : undefined}>
          <div className="card" ref={cardRef}>
            <div className="card-header">
              <h2 className={`card-name ${group}`} ref={nameRef} style={{ fontSize: `${nameSize}px` }}>{number} - {name}</h2>
              {group && <p className={`card-group ${group}`}>{groupNames[group]}</p>}
              {type && <p className={`card-type ${type}`}>{typeNames[type]}</p>}
            </div>
            <div className="card-image-container">
              {image
                ? <img className='card-image' src={image} alt={name} />
                : <p className="card-image-empty">No doggo yet.<br />Upload a pic below!</p>}
            </div>
            <p className="card-description" style={{ fontSize: `${descSize}px` }} ref={descriptionRef}>{description}</p>
          </div>
        </div>
      </div>
      <div className="settings">
        <div className="settings-toolbar">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Name:
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
            {nameOverflow && <span className="field-warning" role="alert">Name's too long to fit. Shorten it.</span>}
          </label>
          <label>
            Number:
            <input type="number" value={number} onChange={(event) => setNumber(event.target.value)} />
          </label>
          <label>
            Group:
            <select value={group} onChange={handleGroupChange}>
              {Object.keys(groupNames).map((key) => (
                <option key={key} value={key}>{groupNames[key]}</option>
              ))}
            </select>
          </label>
          <label>
            Type:
            <select value={type} onChange={handleTypeChange}>
              <option value="">Select a Type</option>
              {Object.keys(typeNames).map((key) => (
                <option key={key} value={key}>{typeNames[key]}</option>
              ))}
            </select>
          </label>
          <label>
            Image:
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {imageError && <span className="field-warning" role="alert">{imageError}</span>}
          </label>
          <label>
            Description:
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            {descOverflow && <span className="field-warning" role="alert">Too much text! It'll run off the card. Trim it down.</span>}
          </label>
          <button
            type="button"
            className="download-button"
            onClick={handleDownload}
            disabled={downloadStatus === 'rendering'}
          >
            {downloadLabels[downloadStatus]}
          </button>
          <p className="download-status" role="status">
            {downloadStatus === 'error' && "Couldn't render the card. Try again."}
          </p>
        </form>
      </div>
      <div className="footer">
        <p>Made by Basbo for Sethja8's <a href='https://steamcommunity.com/sharedfiles/filedetails/?id=2919654479'>DOG GAME - A Tabletop Simulator game.</a></p>
        <p>Check out the <a href="https://github.com/brendanpayne/card-maker">source code</a>.</p>
      </div>
    </div>
  );
};

export default CardGenerator;
