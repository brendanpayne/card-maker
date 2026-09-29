# AI Usage Policy — card-maker

Last updated: 2026-09-28

## Purpose and scope

AI tools are welcome in card-maker, as long as a human reviews, understands, and takes responsibility for every change. The rules below apply to all code, docs, assets, issues, and pull requests in the [card-maker repository](https://github.com/brendanpayne/card-maker), whoever contributes them.

"AI tools" means any generative model or assistant, such as Claude Code, Copilot, ChatGPT, or image generators, whether it is used in an IDE, a CLI, or a browser.

## Permitted uses

You may use AI for any normal development work, as long as you review the result before it lands:

- Writing, refactoring, and debugging React components and CSS
- Writing tests and fixing broken ones
- Drafting docs, including README.md and CLAUDE.md, plus commit messages and PR descriptions
- Explaining unfamiliar code or dependencies such as html2canvas
- Reviewing code before merge

## Prohibited uses

- Pasting secrets, credentials, or deploy keys into an AI tool
- Opening PRs or issues that are fully AI-generated and that you have not read, run, or tested yourself
- Running AI agents that open PRs, post comments, or push commits without a human approving each action
- Using AI to copy the style of a living artist, or to reproduce copyrighted characters or logos, in card art or site assets
- Letting AI rewrite the licence, attribution, or credit lines (such as the footer credit to the DOG GAME author) without the maintainer's approval
- Using AI to impersonate a maintainer or another contributor

## Disclosure and attribution

If AI wrote a meaningful part of a change, say so. Trivial autocomplete does not count.

- **Commits:** add a `Co-Authored-By:` trailer that names the tool, e.g. `Co-Authored-By: Claude <noreply@anthropic.com>`.
- **Pull requests:** add one line to the PR description saying which tool you used and what it did.
- **Assets:** name AI-generated images in the PR (for example a new `bg.png`) and state which tool made them.

The repo's `CLAUDE.md` gives AI assistants their project context. Update it in the same PR when a change makes it out of date.

## Human review and accountability

Whoever submits a change owns it, even if AI wrote it. Before you open a PR, check off each of these:

- [ ] I can explain every line I changed
- [ ] `npm test -- --watchAll=false` and `npm run build` both pass
- [ ] I checked the card preview in `npm start`, and a downloaded PNG looks correct. The layout is pixel-positioned, so AI edits to CSS offsets need a visual check.
- [ ] There are no invented APIs, packages, or config options

## Data, privacy and security

The source code is public, so it may be shared with AI tools. Nothing else leaves your machine without a good reason.

| Data | OK to share with AI tools? |
| --- | --- |
| Repo source, docs, public assets | Yes |
| Error messages and stack traces | Yes, after removing local paths and usernames |
| `.env` files, hosting or DNS credentials, deploy tokens | No |
| Card images or text that users made with the app | No, unless the user agrees |

The app itself does not send user uploads to any AI service. A change that adds an AI feature to the app needs its own discussion first.

## Licensing and IP

All contributions ship under the project's MIT licence, including AI-assisted ones. By submitting, you confirm that you have the right to do so.

- If AI output looks like it was copied verbatim from another project, drop it or credit it under that project's licence.
- Only add fonts and images whose licence allows redistribution, whether AI made them or not. The card frame and game artwork belong to DOG GAME, so do not replace or imitate them with AI output unless the game's author approves.

## Enforcement and updates

- Maintainers may close PRs that break this policy without a detailed review, especially undisclosed AI changes that are unreviewed or untested.
- Anyone who repeatedly submits low-effort AI content may be blocked from contributing.
- This policy is reviewed once a year, or sooner if AI tooling or licensing rules change. To propose changes, open an issue on the repo.
