# Wandersplit

> **Travel Together. Split Seamlessly.**

A polished, production-quality group travel expense splitter built with pure vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, zero dependencies.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)

---

## Overview

Wandersplit eliminates the financial friction of group travel. Whether you're splitting a hotel in Marrakech or a taxi through Tokyo, the app tracks every expense and computes the **minimum number of transfers** needed for everyone to be perfectly even — no spreadsheets, no awkward conversations, no leftover debts.

Everything runs in the browser. Trip data is persisted in `localStorage`. There is no backend, no sign-up, and nothing to install.

---

## Live Demo

Open `index.html` in any modern browser and start splitting immediately.

---

## Features

- **Debt Minimization Engine** — A greedy settlement algorithm reduces the number of required transactions to the mathematical minimum.
- **Multi-Currency Support** — Log expenses in USD, EUR, GBP, JOD, AED, JPY, CAD, or AUD. Each currency is settled independently.
- **Custom Split Rules** — Decide exactly who shares each expense; not every traveler has to share every cost.
- **Persistent Storage** — Trip data survives browser refresh and tab close via `localStorage`.
- **Dark / Light Mode** — A polished theme toggle that persists across sessions.
- **Scroll Reveal Animations** — Smooth Intersection Observer-powered entry animations throughout the landing page.
- **Fully Responsive** — Works on every screen size, from phone to widescreen desktop.
- **Zero Dependencies** — Pure vanilla JavaScript, HTML, and CSS. No npm, no build step.

---

## Tech Stack

| Layer       | Technology                                              |
|-------------|---------------------------------------------------------|
| Markup      | Semantic HTML5 with ARIA roles                          |
| Styles      | CSS3 — Custom Properties, Grid, Flexbox, `oklch()` color |
| Logic       | Vanilla ES6+ JavaScript (`'use strict'`, JSDoc)         |
| Typography  | Google Fonts — Cormorant Garamond + DM Sans             |
| Persistence | Web `localStorage` API                                  |

---

## Project Structure

```
wandersplit/
├── index.html          # Landing page and interactive app shell
├── css/
│   └── style.css       # Complete design system, tokens, and responsive layout
├── js/
│   └── app.js          # State management, settlement engine, and UI controllers
├── .gitignore
├── LICENSE
└── README.md
```

---

## Getting Started

No build step is required. Clone and open.

```bash
# 1. Clone the repository
git clone https://github.com/ramiissa303/wandersplit.git
cd wandersplit

# 2. Open in your browser
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

Or simply drag `index.html` into any modern browser tab.

---

## How It Works

1. **Add travelers** — Enter the names of everyone on the trip. No accounts required.
2. **Record expenses** — For each expense, set the title, amount, currency, who paid, and who it should be split between.
3. **Settle up** — Click *Recalculate* to instantly see the minimum set of transfers that leaves everyone even.

### Settlement Algorithm

The settlement engine uses a **greedy minimum-transactions** approach:

1. For each currency, compute a net-balance map — positive values mean the person is owed money, negative values mean they owe money.
2. Repeatedly match the largest creditor with the largest debtor.
3. Settle the minimum of their absolute balances, then remove entries below the floating-point epsilon threshold (< 0.005).
4. Repeat until all balances are resolved.

This approach handles all practical group sizes (n ≤ ~20) and keeps the number of transactions at or near the theoretical minimum.

---

## Screenshots

> *Screenshots to be added after deployment.*

| Landing Page (Light) | Dashboard (Light) | Dashboard (Dark) |
|:--------------------:|:-----------------:|:----------------:|
| *(placeholder)*      | *(placeholder)*   | *(placeholder)*  |

---

## Future Improvements

- [ ] Export settlement summary as PDF or plain-text message
- [ ] QR-code share link (encode trip state in URL hash for easy sharing)
- [ ] Unequal splits — by percentage or fixed amount per person
- [ ] Expense categories with filtering and per-category totals
- [ ] Trip history with multiple saved sessions
- [ ] Progressive Web App (PWA) support for full offline use

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Author

**Rami Issa**

- GitHub: [@ramiissa303](https://github.com/ramiissa303)
- Email: ramiissa303@gmail.com

---

*Made for travelers who'd rather be exploring.*
