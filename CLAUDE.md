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
- **Group and type drive both labels and colors.** The `groupNames` and `typeNames` maps in `App.js` fill the dropdowns and set the display text. Each key is also used as a CSS class (`.card-group.<key>`, `.card-type.<key>`) that sets the color in `App.css`. To add a group or type, add an entry to the map and a matching color rule. The "Basic" group's key is the empty string, and the default `group` state is an invisible Unicode placeholder (`᲼᲼`).
- **Font sizes auto-fit, one step per keystroke.** The name and description sizes live in React state. On each change, a `requestAnimationFrame` callback measures the rendered element (the name's `clientWidth` against 250px, and the description's `clientHeight` against a 99–125px band) and moves the font size by 1px toward fitting. The size only converges as the user keeps typing. The CSS `font-size: 100px` on these elements is always overridden by the inline style.
- **Export** runs `html2canvas(cardRef.current)` on the `.card` div. The file is named `"<number> - <name>.png"`. Whatever renders inside `.card` is exactly what gets exported.

## Assets & fonts

- Custom card fonts (such as KOMTIT) are defined with `@font-face` in `src/index.css` and point to `public/fonts/*.ttf` through relative `../public/...` paths. `App.css` loads `bg.png` and `dogcard.png` the same way.
- The description font, Patrick Hand SC, comes from a Google Fonts `@import` that must stay at the top of `index.css`. Browsers ignore an `@import` placed after other rules.
