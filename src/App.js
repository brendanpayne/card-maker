import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { loadDraft, saveDraft, loadDraftImage, saveDraftImage, clearDraftImage } from './draftStore';
import './App.css';

const CARD_WIDTH = 407;
const CARD_HEIGHT = 584;
const STACKED_BREAKPOINT = 1000;
const PAGE_GUTTER = 16;
const THUMB_SCALE = 0.13;
// Fixed export resolution (2x the 407x584 preview) so every device downloads the same size.
const EXPORT_SCALE = 2;

const MAX_DESC_FONT_SIZE = 28;
const MIN_DESC_FONT_SIZE = 10;
const SMALL_DESC_FONT_SIZE = 16;
const MAX_DESC_HEIGHT = 125;

const MAX_NAME_FONT_SIZE = 24;
const MIN_NAME_FONT_SIZE = 10;
const MAX_NAME_WIDTH = 250;

const SAVED_MESSAGE_MS = 5000;
const UNDO_MS = 8000;
const AUTOSAVE_DELAY_MS = 400;
const DOG_GAME_URL = 'https://steamcommunity.com/sharedfiles/filedetails/?id=3120904158';

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
const NO_IMAGE_NAME = 'No image yet';
const SAMPLE_IMAGE_URL = `${process.env.PUBLIC_URL}/382.jpg`;
// Image framing on the card: see the crop helpers below.
const DEFAULT_CROP = { zoom: 1, x: 0, y: 0 };

// The example card shown on a first visit. `imageSource` is 'sample', 'upload' or 'none';
// an uploaded image lives in IndexedDB (see draftStore.js), not in the draft itself.
const SAMPLE_CARD = {
  name: 'Scarlet Police',
  number: '382',
  group: '',
  type: 'active',
  description: 'Choose a player. They must return to their starting tile at the end of their turn until they move a cumulative 9 tiles, at which time this card is destroyed.',
  imageSource: 'sample',
  imageName: SAMPLE_IMAGE_NAME,
  crop: DEFAULT_CROP,
};

// Merge a stored draft over the sample, dropping anything malformed or no longer valid.
const restoreCard = (draft) => {
  if (!draft) return SAMPLE_CARD;
  const text = (value, fallback) => (typeof value === 'string' ? value : fallback);
  return {
    name: text(draft.name, SAMPLE_CARD.name),
    number: text(draft.number, SAMPLE_CARD.number).replace(/\D/g, '').slice(0, 4),
    group: draft.group in groups ? draft.group : SAMPLE_CARD.group,
    type: draft.type in types ? draft.type : SAMPLE_CARD.type,
    description: text(draft.description, SAMPLE_CARD.description),
    imageSource: ['sample', 'upload', 'none'].includes(draft.imageSource) ? draft.imageSource : 'sample',
    imageName: text(draft.imageName, SAMPLE_IMAGE_NAME),
    crop: restoreCrop(draft.crop),
  };
};

// ---- Image crop ----
// The art window on the card is a 342px square at (32, 80). `crop` is { zoom, x, y }: zoom 1
// fills the window edge to edge (like object-fit: cover), and x/y shift the image in card px.
// The image is laid out with explicit size and position because html2canvas ignores object-fit.
const FRAME_SIZE = 342;
const FRAME_LEFT = 32;
const FRAME_TOP = 80;
const MAX_ZOOM = 4;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const imageBox = (size, zoom) => {
  const base = Math.max(FRAME_SIZE / size.w, FRAME_SIZE / size.h);
  return { w: size.w * base * zoom, h: size.h * base * zoom };
};

// Keep the zoom in range and the image covering the whole window.
const clampCrop = (size, crop) => {
  const zoom = clamp(crop.zoom, 1, MAX_ZOOM);
  if (!size) return { ...crop, zoom };
  const box = imageBox(size, zoom);
  const maxX = (box.w - FRAME_SIZE) / 2;
  const maxY = (box.h - FRAME_SIZE) / 2;
  return { zoom, x: clamp(crop.x, -maxX, maxX), y: clamp(crop.y, -maxY, maxY) };
};

const imageStyle = (size, crop) => {
  if (!size) return undefined; // Until the image loads, CSS object-fit covers the window.
  const box = imageBox(size, crop.zoom);
  return {
    width: box.w,
    height: box.h,
    left: (FRAME_SIZE - box.w) / 2 + crop.x,
    top: (FRAME_SIZE - box.h) / 2 + crop.y,
    objectFit: 'fill',
  };
};

const restoreCrop = (crop) => {
  const num = (value, fallback) => (Number.isFinite(value) ? value : fallback);
  if (!crop || typeof crop !== 'object') return DEFAULT_CROP;
  return { zoom: clamp(num(crop.zoom, 1), 1, MAX_ZOOM), x: num(crop.x, 0), y: num(crop.y, 0) };
};

const cardTitle = (number, name) => [number, name.trim()].filter(Boolean).join(' - ');

const downloadFileName = (number, name) => {
  const safe = cardTitle(number, name).replace(/[\\/:*?"<>|]/g, '').trim();
  return safe ? `${safe}.png` : 'card.png';
};

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
function CardFace({ cardRef, nameRef, descriptionRef, number, name, group, type, image, imageSize, crop, onImageLoad, description, nameSize, descSize }) {
  return (
    <div className="card" ref={cardRef}>
      <div className="card-header">
        <h2 className="card-name" ref={nameRef} style={{ fontSize: `${nameSize}px` }}>{cardTitle(number, name)}</h2>
        {group && <p className="card-group" style={{ color: groups[group].color }}>{groups[group].label}</p>}
        {type && <p className="card-type" style={{ color: types[type].color }}>{types[type].label}</p>}
      </div>
      <div className="card-image-container">
        {image
          ? (
            <img
              className='card-image'
              src={image}
              alt={name}
              draggable={false}
              style={imageStyle(imageSize, crop)}
              onLoad={onImageLoad && ((event) => onImageLoad({ w: event.target.naturalWidth, h: event.target.naturalHeight }))}
            />
          )
          : <p className="card-image-empty">No dog yet.<br />Choose an image to add one.</p>}
      </div>
      <p className="card-description" style={{ fontSize: `${descSize}px` }} ref={descriptionRef}>{description}</p>
    </div>
  );
}

// Drag/zoom layer over the card's art window, plus a small popup explaining the controls.
// It sits outside `.card`, so it never appears in the exported PNG. `scale` is the preview's
// on-screen scale, used to convert pointer movement back into card pixels.
function ImageAdjuster({ scale, crop, onChange, onReset, onDone }) {
  const frameRef = useRef(null);
  const pointers = useRef(new Map());
  // Handlers read the latest values through refs, so the native wheel listener stays current.
  const latest = useRef({ crop, onChange });
  latest.current = { crop, onChange };
  const touch = !!window.matchMedia?.('(pointer: coarse)').matches;

  const zoomBy = (factor) => {
    const { crop: current, onChange: change } = latest.current;
    const zoom = clamp(current.zoom * factor, 1, MAX_ZOOM);
    const ratio = zoom / current.zoom;
    change({ zoom, x: current.x * ratio, y: current.y * ratio });
  };

  const moveBy = (dx, dy) => {
    const { crop: current, onChange: change } = latest.current;
    change({ ...current, x: current.x + dx, y: current.y + dy });
  };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    frame.focus({ preventScroll: true });
    // A native, non-passive listener so the wheel zooms the image instead of scrolling the page.
    const handleWheel = (event) => {
      event.preventDefault();
      zoomBy(Math.exp(-event.deltaY * 0.0015));
    };
    frame.addEventListener('wheel', handleWheel, { passive: false });
    return () => frame.removeEventListener('wheel', handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };

  const handlePointerMove = (event) => {
    const active = pointers.current;
    const previous = active.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    if (active.size === 1) {
      moveBy((next.x - previous.x) / scale, (next.y - previous.y) / scale);
    } else if (active.size === 2) {
      // Pinch: zoom by how much the distance between the two fingers changed.
      const [, other] = [...active.entries()].find(([id]) => id !== event.pointerId);
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(next.x - other.x, next.y - other.y);
      if (before > 0) zoomBy(after / before);
    }
    active.set(event.pointerId, next);
  };

  const handlePointerUp = (event) => {
    pointers.current.delete(event.pointerId);
  };

  const handleKeyDown = (event) => {
    const moves = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
    if (moves[event.key]) moveBy(...moves[event.key]);
    else if (event.key === '+' || event.key === '=') zoomBy(1.1);
    else if (event.key === '-') zoomBy(1 / 1.1);
    else if (event.key === 'Escape' || event.key === 'Enter') onDone();
    else return;
    event.preventDefault();
  };

  return (
    <>
      <div
        ref={frameRef}
        className="adjust-frame"
        tabIndex={0}
        aria-label="Card image. Drag or use the arrow keys to move it; scroll, pinch or press plus and minus to zoom."
        style={{ left: FRAME_LEFT * scale, top: FRAME_TOP * scale, width: FRAME_SIZE * scale, height: FRAME_SIZE * scale }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      />
      <div className="adjust-popup" role="dialog" aria-label="Adjust image" style={{ top: (FRAME_TOP + FRAME_SIZE + 10) * scale }}>
        <p className="adjust-hint">
          <strong>Drag</strong> to move · <strong>{touch ? 'Pinch' : 'Scroll'}</strong> to zoom
        </p>
        <div className="adjust-actions">
          <button type="button" className="text-button" onClick={onReset}>Reset</button>
          <button type="button" className="secondary-button" onClick={onDone}>Done</button>
        </div>
      </div>
    </>
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
  const [savedDraft] = useState(loadDraft);
  const [start] = useState(() => restoreCard(savedDraft));
  const [name, setName] = useState(start.name);
  const [number, setNumber] = useState(start.number);
  const [imageSource, setImageSource] = useState(start.imageSource);
  // An uploaded image loads asynchronously from IndexedDB, so it starts empty.
  const [image, setImage] = useState(start.imageSource === 'sample' ? SAMPLE_IMAGE_URL : null);
  const [imageName, setImageName] = useState(start.imageName);
  const [imageSize, setImageSize] = useState(null);
  const [crop, setCrop] = useState(start.crop);
  const [adjusting, setAdjusting] = useState(false);
  const adjustButtonRef = useRef(null);
  const [description, setDescription] = useState(start.description);
  const [group, setGroup] = useState(start.group);
  const [type, setType] = useState(start.type);
  // A restored draft counts as edited: it's the user's own work.
  const [hasEdited, setHasEdited] = useState(!!savedDraft);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [undo, setUndo] = useState(null);
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

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  // Bring back an uploaded image from the saved draft.
  useEffect(() => {
    if (savedDraft?.imageSource !== 'upload') return;
    let cancelled = false;
    loadDraftImage().then((dataUrl) => {
      if (cancelled) return;
      if (dataUrl) {
        setImageSize(null);
        setImage(dataUrl);
      } else {
        setImageSource('none');
        setImageName(NO_IMAGE_NAME);
      }
    });
    return () => { cancelled = true; };
  }, [savedDraft]);

  // Autosave once the user has changed something, so the sample card never becomes a draft.
  useEffect(() => {
    if (!hasEdited) return;
    const timer = setTimeout(() => {
      saveDraft({ name, number, group, type, description, imageSource, imageName, crop });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasEdited, name, number, group, type, description, imageSource, imageName, crop]);

  // Wraps a setter so any change also marks the card as edited.
  const edit = (setter) => (value) => {
    setter(value);
    setHasEdited(true);
  };

  const applyCard = (card) => {
    setName(card.name);
    setNumber(card.number);
    setGroup(card.group);
    setType(card.type);
    setDescription(card.description);
    if (card.image !== image) setImageSize(null);
    setImage(card.image);
    setImageSource(card.imageSource);
    setImageName(card.imageName);
    setCrop(card.crop);
    setAdjusting(false);
    setImageError('');
    setDownloadStatus('idle');
    setHasEdited(true);
    if (card.imageSource === 'upload') saveDraftImage(card.image);
    else clearDraftImage();
  };

  // Replace the card, keeping the old one for a few seconds so the change can be undone.
  const replaceCard = (next, message) => {
    const previous = { name, number, group, type, description, image, imageSource, imageName, crop };
    applyCard(next);
    setUndo({ previous, message });
  };

  const blankImage = { image: null, imageSource: 'none', imageName: NO_IMAGE_NAME, crop: DEFAULT_CROP };

  const startFresh = () => {
    replaceCard({ name: '', number: '', group: '', type: '', description: '', ...blankImage }, 'Card cleared.');
  };

  const nextNumber = number ? String(Number(number) + 1).slice(0, 4) : '';

  const startNextCard = () => {
    replaceCard(
      { name: '', number: nextNumber, group, type, description: '', ...blankImage },
      `Started card ${nextNumber ? `#${nextNumber}` : 'fresh'}, same group and type.`,
    );
  };

  const handleUndo = () => {
    if (!undo) return;
    applyCard(undo.previous);
    setUndo(null);
  };

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
      const dataUrl = event.target.result;
      setImageSize(null);
      setImage(dataUrl);
      setImageSource('upload');
      setImageName(file.name);
      setCrop(DEFAULT_CROP);
      setHasEdited(true);
      saveDraftImage(dataUrl);
      openAdjuster();
    };
    // Let the same file be picked again later (e.g. after Start fresh).
    event.target.value = '';
    reader.onerror = () => {
      setImageError(`Couldn't read "${file.name}". Try a different image.`);
    };
    reader.readAsDataURL(file);
  };

  const scrollToPreview = () => {
    previewRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  const handleImageLoad = (size) => {
    setImageSize(size);
    // A restored crop may not fit a different image size; pull it back in range.
    setCrop((current) => clampCrop(size, current));
  };

  const updateCrop = (next) => {
    setCrop(clampCrop(imageSize, next));
    setHasEdited(true);
  };

  const openAdjuster = () => {
    setAdjusting(true);
    if (isStackedLayout()) scrollToPreview();
  };

  const closeAdjuster = () => {
    setAdjusting(false);
    adjustButtonRef.current?.focus({ preventScroll: true });
  };

  const handleDownload = async () => {
    if (downloadStatus === 'rendering') return;
    setDownloadStatus('rendering');
    try {
      if (document.fonts) await document.fonts.ready;
      const canvas = await html2canvas(cardRef.current, {
        scale: EXPORT_SCALE,
        // The on-screen preview may be scaled down on small screens; export at full size.
        onclone: (clonedDoc) => {
          const scaler = clonedDoc.querySelector('.preview .card-scaler');
          if (scaler) scaler.style.transform = 'none';
          clonedDoc.querySelectorAll('.card-image-empty').forEach((el) => el.remove());
        },
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Canvas export returned no data');
      const fileName = downloadFileName(number, name);
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
      setHasDownloaded(true);
    } catch (error) {
      console.error(error);
      setDownloadStatus('error');
    }
  };

  const downloadLabels = {
    idle: 'Download your epic dog card!!',
    rendering: 'Rendering your masterpiece...',
    saved: 'SAVED!!',
    error: 'Try again!!',
  };

  const statusMessages = {
    idle: '',
    rendering: 'Rendering your card.',
    saved: `Show your creation to the fellas! Look for "${savedFileName}" in your downloads.`,
    error: "Couldn't render the card. Your card is still here, so just press the button again.",
  };

  const isScaled = previewScale < 1;
  const cardProps = { number, name, group, type, image, imageSize, crop, description, nameSize, descSize };
  const descTooSmall = !descOverflow && descSize < SMALL_DESC_FONT_SIZE;
  const showThumb = stacked && !previewInView;

  return (
    <div className="page">
      <main className="workspace">
        <section className="preview" ref={previewRef} aria-label="Card preview">
          <div
            className="card-container"
            style={isScaled ? { width: CARD_WIDTH * previewScale, height: CARD_HEIGHT * previewScale } : undefined}
          >
            <div className="card-scaler" style={isScaled ? { transform: `scale(${previewScale})` } : undefined}>
              <CardFace
                {...cardProps}
                cardRef={cardRef}
                nameRef={nameRef}
                descriptionRef={descriptionRef}
                onImageLoad={handleImageLoad}
              />
            </div>
          </div>
          {adjusting && image && (
            <ImageAdjuster
              scale={previewScale}
              crop={crop}
              onChange={updateCrop}
              onReset={() => updateCrop(DEFAULT_CROP)}
              onDone={closeAdjuster}
            />
          )}
          {downloadStatus === 'saved' && <div className="saved-stamp" aria-hidden="true">SAVED!</div>}
        </section>

        <section className="settings" aria-labelledby="app-title">
          <header className="settings-header">
            <h1 id="app-title" className="app-title">Dog Game Card Generator</h1>
            <button type="button" className="text-button" onClick={startFresh}>
              Start fresh
            </button>
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
                  <input type="text" value={name} onChange={(event) => edit(setName)(event.target.value)} />
                </label>
                <label className="field field--number">
                  <span className="field-label">Number</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={number}
                    onChange={(event) => edit(setNumber)(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                </label>
              </div>
              {nameOverflow && <p className="field-note field-note--error" role="alert">Name and number are too long to fit. Shorten one of them.</p>}
              <ChipGroup legend="Group" name="group" options={groups} perRow={4} value={group} onChange={(event) => edit(setGroup)(event.target.value)} />
              <ChipGroup legend="Type" name="type" options={types} perRow={3} value={type} onChange={(event) => edit(setType)(event.target.value)} />
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
                  <button
                    ref={adjustButtonRef}
                    type="button"
                    className="file-button"
                    onClick={adjusting ? closeAdjuster : openAdjuster}
                    disabled={!image}
                    aria-pressed={adjusting}
                  >
                    Adjust
                  </button>
                  <span className="file-name">{imageName}</span>
                </div>
                <p id="image-hint" className="field-note">Use Adjust to move or zoom the image.</p>
                {imageError && <p className="field-note field-note--error" role="alert">{imageError}</p>}
              </div>
              <label className="field">
                <span className="field-label-row">
                  <span className="field-label">Description</span>
                  <span className="field-meta" aria-hidden="true">Card text: {descSize}px</span>
                </span>
                <textarea value={description} onChange={(event) => edit(setDescription)(event.target.value)} />
              </label>
              {descOverflow && <p className="field-note field-note--error" role="alert">Too much text! It'll run off the card. Trim it down.</p>}
              {descTooSmall && <p className="field-note field-note--caution" role="status">Getting tiny! Players might need a magnifying glass.</p>}
            </fieldset>

            <div className="download-bar">
              <div className="download-row">
                {showThumb && (
                  <button type="button" className="bar-thumb" onClick={scrollToPreview} aria-label="Scroll up to the full card preview">
                    <div className="card-scaler" style={{ transform: `scale(${THUMB_SCALE})` }} aria-hidden="true">
                      <CardFace {...cardProps} />
                    </div>
                    {downloadStatus === 'saved' && <span className="thumb-stamp" aria-hidden="true">SAVED!</span>}
                  </button>
                )}
                <button
                  type="button"
                  className="download-button"
                  data-status={downloadStatus}
                  data-pulse={downloadStatus === 'idle' && hasEdited}
                  onClick={handleDownload}
                  aria-disabled={downloadStatus === 'rendering'}
                >
                  {downloadLabels[downloadStatus]}
                </button>
              </div>
              <p className={`download-status download-status--${downloadStatus}`} role="status">
                {statusMessages[downloadStatus]}
              </p>
              {(undo || hasDownloaded) && (
                <div className="bar-actions">
                  {undo && (
                    <p className="undo-notice" role="status">
                      {undo.message}{' '}
                      <button type="button" className="text-button" onClick={handleUndo}>Undo</button>
                    </p>
                  )}
                  {hasDownloaded && !undo && (
                    <button type="button" className="secondary-button" onClick={startNextCard}>
                      Next card{nextNumber ? ` (#${nextNumber})` : ''}
                    </button>
                  )}
                </div>
              )}
            </div>
          </form>
        </section>
      </main>

      <footer className="footer">
        <p>Made by Basbo for Sethja8's <a href={DOG_GAME_URL}>DOG GAME - A Tabletop Simulator game.</a></p>
        <p>Check out the <a href="https://github.com/brendanpayne/card-maker">source code</a>.</p>
      </footer>
    </div>
  );
};

export default CardGenerator;
