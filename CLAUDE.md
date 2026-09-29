# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-page Create React App (react-scripts 5, React 18) that generates trading cards for DOG GAME, a Tabletop Simulator game. Users edit card fields in a form, see a live preview, and download the card as a PNG via `html2canvas`. It is deployed at https://doggame.thememecult.com/.

## Commands

- `npm start`: dev server on http://localhost:3000
- `npm run build`: production build into `build/`
- `npm test`: Jest in watch mode. Run once with `npm test -- --watchAll=false`, or run one test with `npm test -- -t "<name>"`.
- Linting uses CRA's built-in ESLint (`react-app` config) and runs during `start` and `build`. There is no separate lint script.

## AI policy

Follow `AI_POLICY.md`. Never put secrets or users' card content into prompts. Changes to CSS offsets need a visual check of the preview and the exported PNG.

Never run `git commit`. Stage finished work with `git add`; the maintainer writes all commit messages.

## Architecture

All app logic is in one component, `CardGenerator` in `src/App.js`, and all card styling is in `src/App.css`.

- **Card layout is pixel-positioned.** `.card` is a fixed 407×584 box that uses `public/dogcard.png` as its background frame. The name, group, image, and description are placed with `position: absolute` plus hard-coded margins so they line up with that artwork. If you change the frame image, you must re-tune these offsets.
- **Group and type are one map each.** `groups` and `types` in `App.js` hold each option's label and printed colour. That colour is applied inline to the card text and to the colour dot on the form's radio chips, so to add a group or type you only add a map entry. An empty-string key means "none": Basic for groups (no group line on the card) and None for types.
- **The card renders twice.** `CardFace` is used for the real preview, which has the refs that are measured and exported, and for a small thumbnail in the sticky download bar (`.bar-thumb`). The thumbnail only shows in the stacked layout, once the full preview scrolls out of view. Only the real preview may carry `cardRef`, `nameRef` and `descriptionRef`.
- **The image is positioned by hand, not with `object-fit`.** html2canvas ignores `object-fit`, which would stretch non-square art in the PNG. So `imageStyle` gives the `<img>` an explicit size and position inside the 342px art window, based on its natural size and the `crop` value `{ zoom, x, y }`. Zoom 1 means the image just fills the window. `clampCrop` keeps the window covered.
  - `ImageAdjuster` is the drag, pinch, wheel and keyboard layer plus its hint popup. It is rendered in `.preview`, outside `.card`, so it never appears in exports.
  - It opens automatically after an upload, or from the Adjust button.
- **Drafts autosave.** After the first edit, the card's text fields are saved to localStorage under `card-draft`, 400ms after each change. An uploaded image goes to IndexedDB instead, via `src/draftStore.js`, because data-URL images can overflow localStorage. On load, `restoreCard` merges the draft over `SAMPLE_CARD` and drops any values that are no longer valid.
  - `imageSource` records where the image came from: `'sample'`, `'upload'` or `'none'`.
  - "Start fresh" and "Next card" both go through `replaceCard`, which can be undone for 8 seconds.
  - `number` is a digits-only string of at most 4 characters, not a number.
- **Font sizes auto-fit in a layout effect.** `fitFontSize` shrinks the name (checking `clientWidth` against 250px) and the description (checking `clientHeight` against 125px) from their maximum size, 1px at a time, until the text fits. It reruns when the text changes and again whenever a web font finishes loading (`fonts.ready` and each `loadingdone` event). If the text still doesn't fit at the minimum size, a warning appears under that form field. The CSS `font-size: 100px` on these elements is always overridden by the inline style.
- **Export** waits for fonts to load, then runs `html2canvas(cardRef.current)` on the `.card` div at `EXPORT_SCALE` (2×, so every download is 814×1168). It saves the result as a blob named `"<number> - <name>.png"`, with characters that aren't allowed in file names stripped out. Its `onclone` step removes the preview scaling and the empty-image placeholder. Any image on the card must be same-origin or a data URL; html2canvas drops cross-origin images that lack CORS headers.
- **Responsive preview.** Below 1000px (`STACKED_BREAKPOINT` in `App.js`, which must match the media query in `App.css`), the layout stacks into one column. `.card-scaler` then scales the preview with `transform` to fit the screen width. Scaling only affects what's on screen; exports and the auto-fit measurements are unaffected.

- **Light/dark theme.** `data-theme` on `<html>` switches the CSS custom properties at the top of `App.css`. Those tokens only style the page, the form panel and the footer; the `.card` never uses them, so exports look identical in both themes. An inline script in `public/index.html` sets the theme before first paint, and the theme logic in `App.js` must stay in step with it. A theme saved in `localStorage` under `theme` wins; otherwise the page follows `prefers-color-scheme` live.

## Assets & fonts

- Custom card fonts (such as KOMTIT) are defined with `@font-face` in `src/index.css` and point to `public/fonts/*.ttf` through relative `../public/...` paths. `App.css` loads `bg.png` and `dogcard.png` the same way.
- The description font, Patrick Hand SC, comes from a Google Fonts `@import` that must stay at the top of `index.css`. Browsers ignore an `@import` placed after other rules.
