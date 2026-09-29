import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

const CARD_WIDTH = 407;
const CARD_HEIGHT = 584;
const STACKED_BREAKPOINT = 1000;
const PAGE_GUTTER = 16;
const PEEK_SCALE = 0.28;

const MAX_DESC_FONT_SIZE = 28;
const MIN_DESC_FONT_SIZE = 10;
const SMALL_DESC_FONT_SIZE = 16;
const MAX_DESC_HEIGHT = 125;

const MAX_NAME_FONT_SIZE = 24;
const MIN_NAME_FONT_SIZE = 10;
const MAX_NAME_WIDTH = 250;

const SAVED_MESSAGE_MS = 5000;

// Label and printed colour for each group and type. The colour is used both on the
// card and on the picker swatches, so this is the single source for both.
const groups = {
  '': { label: 'Basic', color: null },
  'otto': { label: 'Otto', color: '#404040' },
  'bushido': { label: 'Bushido', color: '#1B8031' },
  'rat': { label: 'Rat', color: '#00127E' },
  'shop': { label: 'Shop', color: '#0761B7' },
  'realm': { label: `Hitler's Realm`, color: '#7A0406' },
  'pit': { label: 'Pit', color: '#DB8D07' },
  'cultist': { label: 'Cultist', color: '#B200FF' },
};

const types = {
  '': { label: 'None', color: null },
  'pre-turn': { label: 'Pre-Turn Card', color: '#DB8D07' },
  'aod': { label: 'Activate on Draw', color: '#FF0000' },
  'board': { label: 'Board Card', color: '#1A7F31' },
  'active': { label: 'Active Card', color: '#7E070B' },
  'passive': { label: 'Passive Card', color: '#0565BB' },
};

const SAMPLE_IMAGE_NAME = 'Sample art (382.jpg)';

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

const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const isStackedLayout = () => window.innerWidth < STACKED_BREAKPOINT;

const getPreviewScale = () => {
  if (!isStackedLayout()) return 1;
  return Math.min(1, (window.innerWidth - PAGE_GUTTER * 2) / CARD_WIDTH);
};

// The card artwork. Rendered once as the real preview (with refs, measured and exported)
// and once as the small mobile peek.
function CardFace({ cardRef, nameRef, descriptionRef, number, name, group, type, image, description, nameSize, descSize }) {
  return (
    <div className="card" ref={cardRef}>
      <div className="card-header">
        <h2 className="card-name" ref={nameRef} style={{ fontSize: `${nameSize}px` }}>{number} - {name}</h2>
        {group && <p className="card-group" style={{ color: groups[group].color }}>{groups[group].label}</p>}
        {type && <p className="card-type" style={{ color: types[type].color }}>{types[type].label}</p>}
      </div>
      <div className="card-image-container">
        {image
          ? <img className='card-image' src={image} alt={name} />
          : <p className="card-image-empty">No doggo yet.<br />Upload a pic below!</p>}
      </div>
      <p className="card-description" style={{ fontSize: `${descSize}px` }} ref={descriptionRef}>{description}</p>
    </div>
  );
}

// Radio chips laid out in rows of `perRow`, each row stretched to the full width so
// the rows are even. On narrow screens a row may still wrap rather than overflow.
function ChipGroup({ legend, name, options, value, onChange, perRow }) {
  const entries = Object.entries(options);
  const rows = [];
  for (let i = 0; i < entries.length; i += perRow) rows.push(entries.slice(i, i + perRow));

  return (
    <fieldset className="chip-group">
      <legend className="field-label">{legend}</legend>
      <div className="chips">
        {rows.map((row, rowIndex) => (
          <div className="chip-row" key={rowIndex}>
            {row.map(([key, option]) => (
              <label className="chip" key={key || 'none'}>
                <input type="radio" name={name} value={key} checked={value === key} onChange={onChange} />
                <span className="chip-face">
                  <span
                    className={option.color ? 'chip-dot' : 'chip-dot chip-dot--none'}
                    style={option.color ? { backgroundColor: option.color } : undefined}
                    aria-hidden="true"
                  />
                  <span className="chip-label" data-label={option.label}>{option.label}</span>
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function CardGenerator() {
  const [name, setName] = useState('Scarlet Police');
  const [number, setNumber] = useState(382);
  const [image, setImage] = useState(`${process.env.PUBLIC_URL}/382.jpg`);
  const [imageName, setImageName] = useState(SAMPLE_IMAGE_NAME);
  const [description, setDescription] = useState('Choose a player. They must return to their starting tile at the end of their turn until they move a cumulative 9 tiles, at which time this card is destroyed.');
  const [group, setGroup] = useState('');
  const [type, setType] = useState('active');
  const cardRef = useRef(null);
  const previewRef = useRef(null);

  const [descSize, setDescSize] = useState(MAX_DESC_FONT_SIZE);
  const [descOverflow, setDescOverflow] = useState(false);
  const descriptionRef = useRef(null);

  const [nameSize, setNameSize] = useState(MAX_NAME_FONT_SIZE);
  const [nameOverflow, setNameOverflow] = useState(false);
  const nameRef = useRef(null);

  const [fontsVersion, setFontsVersion] = useState(0);
  const [previewScale, setPreviewScale] = useState(getPreviewScale);
  const [stacked, setStacked] = useState(isStackedLayout);
  const [previewInView, setPreviewInView] = useState(true);
  const [downloadStatus, setDownloadStatus] = useState('idle');
  const [savedFileName, setSavedFileName] = useState('');
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

  // Refit whenever a web font finishes loading. `fonts.ready` alone can resolve before a
  // late-starting font (e.g. the Google-hosted Patrick Hand SC) loads, leaving the text
  // sized against the fallback font.
  useEffect(() => {
    if (!document.fonts) return;
    let cancelled = false;
    const bump = () => { if (!cancelled) setFontsVersion((v) => v + 1); };
    document.fonts.ready.then(bump);
    document.fonts.addEventListener?.('loadingdone', bump);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener?.('loadingdone', bump);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPreviewScale(getPreviewScale());
      setStacked(isStackedLayout());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track whether the full preview is on screen, so the mobile peek can stand in for it.
  useEffect(() => {
    if (!('IntersectionObserver' in window) || !previewRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPreviewInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(previewRef.current);
    return () => observer.disconnect();
  }, []);

  // Refit after every render that changes the text, and again once web fonts load,
  // so pasted or cleared text lands at the right size immediately.
  useLayoutEffect(() => {
    if (!nameRef.current) return;
    const result = fitFontSize(nameRef.current, MAX_NAME_FONT_SIZE, MIN_NAME_FONT_SIZE,
      (el) => el.clientWidth <= MAX_NAME_WIDTH);
    setNameSize(result.size);
    setNameOverflow(!result.fits);
  }, [name, number, fontsVersion]);

  useLayoutEffect(() => {
    if (!descriptionRef.current) return;
    const result = fitFontSize(descriptionRef.current, MAX_DESC_FONT_SIZE, MIN_DESC_FONT_SIZE,
      (el) => el.clientHeight <= MAX_DESC_HEIGHT);
    setDescSize(result.size);
    setDescOverflow(!result.fits);
  }, [description, fontsVersion]);

  useEffect(() => {
    if (downloadStatus !== 'saved') return;
    const timer = setTimeout(() => setDownloadStatus('idle'), SAVED_MESSAGE_MS);
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
      setImageName(file.name);
    };
    reader.onerror = () => {
      setImageError(`Couldn't read "${file.name}". Try a different image.`);
    };
    reader.readAsDataURL(file);
  };

  const scrollToPreview = () => {
    previewRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  const handleDownload = async () => {
    if (downloadStatus === 'rendering') return;
    setDownloadStatus('rendering');
    try {
      if (document.fonts) await document.fonts.ready;
      const canvas = await html2canvas(cardRef.current, {
        // The on-screen preview may be scaled down on small screens; export at full size.
        onclone: (clonedDoc) => {
          const scaler = clonedDoc.querySelector('.preview .card-scaler');
          if (scaler) scaler.style.transform = 'none';
          clonedDoc.querySelectorAll('.card-image-empty').forEach((el) => el.remove());
        },
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Canvas export returned no data');
      const fileName = (name && number) ? `${number} - ${name}.png` : 'card.png';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setSavedFileName(fileName);
      setDownloadStatus('saved');
    } catch (error) {
      console.error(error);
      setDownloadStatus('error');
    }
  };

  const downloadLabels = {
    idle: 'Download your epic dog card!!',
    rendering: 'Rendering your masterpiece...',
    saved: 'SAVED!!',
    error: 'Download your epic dog card!!',
  };

  const statusMessages = {
    idle: '',
    rendering: '',
    saved: `Show your creation to the fellas! Look for "${savedFileName}" in your downloads.`,
    error: "Couldn't render the card. Try again, or refresh the page if it keeps failing.",
  };

  const isScaled = previewScale < 1;
  const cardProps = { number, name, group, type, image, description, nameSize, descSize };
  const descTooSmall = !descOverflow && descSize < SMALL_DESC_FONT_SIZE;

  return (
    <div className="page">
      <main className="workspace">
        <section className="preview" ref={previewRef} aria-label="Card preview">
          <div
            className="card-container"
            style={isScaled ? { width: CARD_WIDTH * previewScale, height: CARD_HEIGHT * previewScale } : undefined}
          >
            <div className="card-scaler" style={isScaled ? { transform: `scale(${previewScale})` } : undefined}>
              <CardFace {...cardProps} cardRef={cardRef} nameRef={nameRef} descriptionRef={descriptionRef} />
            </div>
          </div>
          {downloadStatus === 'saved' && <div className="saved-stamp" aria-hidden="true">SAVED!</div>}
        </section>

        <section className="settings" aria-labelledby="app-title">
          <header className="settings-header">
            <h1 id="app-title" className="app-title">Dog Game Card Generator</h1>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </header>

          <form className="card-form" onSubmit={handleSubmit}>
            <fieldset className="form-section">
              <legend className="section-title">The Card</legend>
              <div className="field-row">
                <label className="field">
                  <span className="field-label">Name</span>
                  <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label className="field field--number">
                  <span className="field-label">Number</span>
                  <input type="number" value={number} onChange={(event) => setNumber(event.target.value)} />
                </label>
              </div>
              {nameOverflow && <p className="field-note field-note--error" role="alert">Name and number are too long to fit. Shorten one of them.</p>}
              <ChipGroup legend="Group" name="group" options={groups} perRow={4} value={group} onChange={(event) => setGroup(event.target.value)} />
              <ChipGroup legend="Type" name="type" options={types} perRow={3} value={type} onChange={(event) => setType(event.target.value)} />
            </fieldset>

            <fieldset className="form-section">
              <legend className="section-title">Art &amp; Rules</legend>
              <div className="field">
                <span className="field-label" aria-hidden="true">Image</span>
                <div className="file-picker">
                  <input
                    id="image-input"
                    className="file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    aria-describedby="image-hint"
                  />
                  <label htmlFor="image-input" className="file-button">Choose image</label>
                  <span className="file-name">{imageName}</span>
                </div>
                <p id="image-hint" className="field-note">Cropped to a square, so keep your dog in the middle.</p>
                {imageError && <p className="field-note field-note--error" role="alert">{imageError}</p>}
              </div>
              <label className="field">
                <span className="field-label-row">
                  <span className="field-label">Description</span>
                  <span className="field-meta" aria-hidden="true">Card text: {descSize}px</span>
                </span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
              </label>
              {descOverflow && <p className="field-note field-note--error" role="alert">Too much text! It'll run off the card. Trim it down.</p>}
              {descTooSmall && <p className="field-note field-note--caution">Getting tiny! Players might need a magnifying glass.</p>}
            </fieldset>

            <div className="download-bar">
              <button
                type="button"
                className="download-button"
                data-status={downloadStatus}
                onClick={handleDownload}
                aria-disabled={downloadStatus === 'rendering'}
              >
                {downloadLabels[downloadStatus]}
              </button>
              <p className={`download-status download-status--${downloadStatus}`} role="status">
                {statusMessages[downloadStatus]}
              </p>
            </div>
          </form>
        </section>
      </main>

      {stacked && !previewInView && (
        <button type="button" className="preview-peek" onClick={scrollToPreview} aria-label="Scroll up to the full card preview">
          <div className="card-scaler" style={{ transform: `scale(${PEEK_SCALE})` }} aria-hidden="true">
            <CardFace {...cardProps} />
          </div>
        </button>
      )}

      <footer className="footer">
        <p>Made by Basbo for Sethja8's <a href='https://steamcommunity.com/sharedfiles/filedetails/?id=2919654479'>DOG GAME - A Tabletop Simulator game.</a></p>
        <p>Check out the <a href="https://github.com/brendanpayne/card-maker">source code</a>.</p>
      </footer>
    </div>
  );
};

export default CardGenerator;
