# Hacker News & Reddit Growth Playbook (EN)

---

## 1. Hacker News: Show HN Post

### Title:
`Show HN: Vocab Vault – Zero-build, local-first etymology and SRS engine in vanilla JS`

### Body:
```text
Hi HN,

I built Vocab Vault (https://[YOUR_URL]) because I wanted an etymology-first vocabulary learning tool that doesn't rely on bloated front-end frameworks or lock my personal learning history into a walled garden.

Architectural highlights:
1. Zero-build step: Pure vanilla ES6 modules running directly in modern browsers. No npm run build, Webpack, or Vite required.
2. Local-first SSOT: IndexedDB serves as the single source of truth with LocalStorage mirroring, surviving iOS Safari's 7-day storage purge limit.
3. Canvas 2D Physics Graph with Viewport Culling: An interactive force-directed spring model that clusters words by Indo-European roots (*sta-, *spek-, *genh₁-). Uses spatial viewport culling to maintain 60–120 fps even with 2,000+ nodes.
4. CSS Virtualization: Uses `content-visibility: auto` and `contain-intrinsic-size` on flashcard DOM nodes, dropping layout calculation overhead to near zero for 5,000+ entries.
5. Cognitive Anchor SRS: SM-2 augmented with an "Organization Effect" multiplier—words with connected cognates get an 8%–15% review interval bonus, preventing over-reviewing.

You can try it immediately without creating an account or logging in; click "Starter Pack" on the top right to load 50 curated roots and cognates.

Full data portability is built-in: one-click exports to Obsidian-compatible Markdown notes, Anki TSV, and raw JSON.

Code and live app: https://[YOUR_URL]
Feedback and criticism on the SRS scheduling or etymological root clustering are very welcome!
```

---

## 2. Reddit: r/Anki Post

### Title:
`I built a local-first web app that auto-generates Anki cards with Indo-European roots and concept history`

### Body:
```text
Hey r/Anki,

Like many of you, I've used Anki for years. But my biggest friction point was always card creation: researching the Proto-Indo-European (PIE) root, finding cognates, and formatting core concept explanations took 5–10 minutes per word.

I built a tool called Vocab Vault to automate this without losing Anki's principles:
- Enter any word, and it extracts the PIE root, historical semantic shift, and core mental image.
- Visualizes connected cognates (e.g. how *inspect*, *respect*, *expect*, and *spectacle* all stem from PIE `*spek-`).
- Features a built-in mobile swipe review mode with SM-2, haptic feedback, and relative overdue ratio sorting.
- Has a 1-click "Export to Anki TSV" button (formatted with Front, Back, IPA, and Tags ready for native Anki desktop import).

It's completely free to try in the browser without sign-up: https://[YOUR_URL]

Would love to hear how fellow Anki power users think of the etymology anchor algorithm!
```

---

## 3. Reddit: r/ObsidianMD Post

### Title:
`Created a local-first etymology vocabulary engine that exports directly into linked Obsidian Markdown notes`

### Body:
```text
Hey Obsidian community,

I'm a big believer in PKM (Personal Knowledge Management) and networked thought. Brute-force vocabulary flashcards always felt disconnected from my Obsidian vault.

I built Vocab Vault (https://[YOUR_URL]), a local-first PWA that treats vocabulary as a bidirectional knowledge graph:
- Roots and words are connected via Indo-European and Latin origins.
- Every card includes a 1-click "Export to Obsidian Markdown" feature, outputting frontmatter tags (`#vocabulary`, `#etymology`), IPA phonetics, concept history notes, and `[[wikilinks]]` between cognate words.
- All data is stored in your browser's IndexedDB—no accounts required, zero proprietary lock-in.

Check it out and let me know what you think of the Markdown note structure!
```

---

## 4. Reddit: r/etymology Post

### Title:
`Interactive 2D physics graph showing English words clustered by Proto-Indo-European roots`

### Body:
```text
Hi r/etymology!

I've been working on a project to visualize the deep genealogical relationships between English, French, and German words using an interactive physics-based node graph.

For instance, when looking up words stemming from PIE `*sta-` (to stand), you can watch the graph cluster *station*, *statue*, *substance*, *destiny*, and *standard* around the root node in real time.

It's live and free to play with here: https://[YOUR_URL]
(Click "Starter Pack" to see a pre-clustered network of 50 classical roots).

Feedback from etymology enthusiasts on root reconstructions and historical notes is greatly appreciated!
```
