# Taxwire | Account Manager World

**Own the relationship. Understand the tax. Deliver the outcome.**

**Unofficial training prototype. Not endorsed by Taxwire. Fictional customers. Educational simulation—not tax advice.**

A browser-based 3D workplace game with original smooth adult character models, articulated movement, furnished contemporary interiors, eight connected walkable locations, and one deterministic simulation engine shared with an accessible 2D workbench. All work is simulated: no real CRM, email, calendar, tax, bank, payment, analytics, or model service is connected. The office and people are fictional. No employment affiliation, job offer, partnership or official credential is implied.

## Play and run locally

Published game: https://aaronstarrett.github.io/taxwire-am-world-unofficial/ (the previous release is verified; revised release verification is recorded separately in BUILD_STATE.md).

Windows project root: `D:\Career\TaxWire\Taxwire-AM-World\`. Double-click **RUN-TAXWIRE-AM-WORLD.cmd** after a successful build. It verifies the Extreme SSD, reuses its saved localhost port when free (or selects a free port with an origin-change warning), opens an installed Chrome/Edge with a dedicated `.local/browser-profile` on D:, and prints the actual URL. Use **STOP-TAXWIRE-AM-WORLD.cmd** to stop only this project's tracked server and dedicated browser. Errors remain in `.local/server-error.log`. No global Node/browser settings are changed.

Use Node **24+**. If the installed Node is older, the launcher can reuse an already bundled Codex Node runtime by copying it to `.local/runtime` on D:. The implementation also uses `.local/node.exe` copied from that existing runtime. No operating system or global SDK installation is needed.

For a fresh checkout, use a supported existing runtime, set `TEMP`, `TMP`, `npm_config_cache`, and `PLAYWRIGHT_BROWSERS_PATH` inside the project's `.local` directory, then run:

```sh
npm ci --no-fund --no-audit
npm run check
npm run test:browser
```

`npm run dev` starts Vite for development. The command launchers serve the production `dist` build. `.npmrc` keeps package cache project-scoped. Node 24 must be the runtime used by npm and subprocesses; on Windows npm.cmd may select an older node.exe beside itself. Run a compatible npm CLI explicitly with the supported Node when necessary. The release workflow uses Node 24 on a standard GitHub runner.

## Controls and a first session

WASD/arrows move; drag the mouse to rotate the third-person camera; E interacts with a nearby object; click the ground to navigate; R recovers to a safe location. M opens the map, J the journal, P pauses, Esc closes panels/releases capture. Touch movement buttons and menu navigation are available. Typing pauses movement. Low/medium/high graphics, reduced motion, text scaling, sensitivity, mute, and a graphics-failure workbench are available in Settings.

Choose **Start your guided first day** on a fresh profile. Morgan Vale introduces one control at a time, the headquarters workstation, a small Cedarline discovery request, a simulated appointment, two useful customer facts, a retained preparation note, a bounded update, an owned follow-up and a later response. Verify what the response actually establishes and retain missing evidence as owned work. The 10-15 minute target is learner paced, with no countdown. Then apply discovery in `M-A02`, continue through the handoff and mixed relationship/tax lessons, and taper assistance through Bootcamp. Returning profiles use **Continue your day** with an objective recap; existing learners can opt into or replay guidance without resetting cases. Free exploration and all unlocked cases remain available.

The persistent objective explains what to do, where, why and what completes it. Show me where, explanations, a three-level hint ladder, recovery, controls and Journal stay available in the world and work tools. Guided, Assisted and Independent attempts have distinct teaching behavior; help is recorded, and helped work does not silently earn unaided mastery. Visit desks/NPCs or use explicit workbench alternatives; travel is optional. Opening a panel alone does not advance a tutorial step. Study and real time away remain penalty free.

## Content and assessment

- 24 permanent competencies (`T01–T12`, `A01–A12`), with explanations, examples, vocabulary, misconceptions, guided/independent practice, rubrics and reusable outputs.
- 24 core cases, 24 distinct advanced cases and shared capstones `C01–C04`; 104 fictional evidence documents and eight calculation exercises.
- 12 fictional accounts and 40 NPCs with limited knowledge, availability, authority and communication preferences.
- Seven-session Bootcamp, replay, independent attempts, spaced review and mentor study. Game titles reflect simulation evidence only.
- Simulated inbox, calendar, portfolio/stakeholder records, research/documents, reconciliation worksheet, issue board, owned tasks, account plans, health consequences, reviews, renewal evidence and action history.

Scores weight tax/evidence 25%, execution/verification 25%, communication 20%, commercial judgment 15%, prioritization/documentation 15%. Critical failures require remediation. Structured actions and stated arithmetic are graded deterministically. Free text receives a transparent rubric/model comparison and learner self-review, not automated expert judgment. Repeat actions/attempts cannot farm positive consequences. An update alone does not close an issue.

The business clock advances only through deliberate actions. Study, pause, graphics frames and real time away cause no penalties. Specialist queues use the save's seed. Statutory deadlines, customer promises and fictional internal targets are explained separately. Money uses integer minor units with explicit currency, basis points and rounding.

## Sources and boundaries

See [SOURCE_REGISTER.md](SOURCE_REGISTER.md) and [CONTENT_COVERAGE.md](CONTENT_COVERAGE.md). All six supplied tax references were accessed; qualified tax/legal review remains pending. Retrieval does not establish legal currency. Unreviewed law is a research dependency, not an authoritative liability key. Rates/thresholds used in exercises are explicitly synthetic. Public company marketing and the public role description do not establish actual employer procedures or approval authority.

Brand colors were derived by inspecting public Taxwire HTML. Signage uses an original text treatment. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the [full distributed software notices](public/THIRD_PARTY_LICENSES.txt). The MIT code/original-artwork license grants no third-party trademark rights.

## Saving and transfer

Meaningful actions autosave to IndexedDB in the current browser profile. The D: launcher uses `.local/browser-profile`; ordinary browsers store data wherever that browser manages its profile. Windows/Chrome/Codex may write host-controlled application data outside D:; this website cannot control all operating-system caches. Project-controlled caches, builds, exports, browser test profiles, evidence and downloads remain on D:.

**Localhost, GitHub Pages and other devices do not automatically share saves.** A different local port is also a different save origin; the launcher remembers its port to preserve local progress across restarts. Open Saves & export to download validated training history or an engine-specific world checkpoint. Imports show provenance, version and case compatibility and preserve newer local progress and unknown extensions. Different case fingerprints do not pass a different local case. Imported history is self-reported, not a verified credential. Checkpoints, backup-before-upgrade, corrupt-save recovery, multiple profiles and reset confirmation are implemented. Save version 3 adds a separately versioned first-day history and assistance records. Versions 1 and 2 migrate with prior progress retained and a browser-local backup before replacement. Earlier attempts retain their original evidence and explicitly lack historical assistance tracking; a fresh independent attempt supplies current evidence. Revised case records preserve old attempts and require a fresh attempt rather than quietly grading changed facts. Portable training schema 1 and world envelope 1 remain unchanged. Invalid scene positions recover safely without changing mission progress.

The shared contract is in `public/compatibility/training.schema.json`, with two synthetic edition fixtures. A real export from the independently built Academy has not been tested; actual cross-app interoperability is unverified. No automatic synchronization or cross-origin database access is assumed. Keep learner exports private and outside Git.

## Architecture, authoring and release

`src/world` owns rendering/navigation; `src/engine` owns domain transitions, clock, assessment, persistence and transfer; `src/content` owns validated versioned facts, characters, policies and teaching; `src/ui` provides both views' work surfaces. The engine runs headlessly without WebGL. Optional dialogue/coach adapters are disabled and fall back to authored responses; no key or paid inference is required.

The local scenario editor validates schema, references, passing branches, orphan evidence and prerequisite cycles, then exports a candidate. It does not silently install unreviewed legal rules. Local authoring is not secure enterprise authorization. Future authorized private content belongs outside this public repository, under `D:\Career\TaxWire\Private-Training-Content\`, with separate explicit build controls and professional review. No private content is included.

`main` is the designated release branch. Work in `development` or feature branches; PRs run required validation. Only a passing `main` workflow may upload `dist` and deploy to GitHub Pages. Jobs use standard `ubuntu-latest` runners, bounded timeouts, pinned official actions, no paid service, and one-day Pages artifact retention. No custom domain or billing changes. The Vite base path is `/taxwire-am-world-unofficial/`; hash panels support direct navigation and refresh without server routing. Assets use relative/subpath URLs; no localhost service is needed online.

GitHub Pages public-repository hosting limits and workflow permissions were checked against the [official limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) and [custom-workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). This is a non-commercial educational prototype, with no sensitive transactions. Build budgets: 8 MB raw whole game, 3 MB gzip whole game, 50 MB maximum asset; actual measured output is much smaller. Browser renderer measurements are recorded locally and do not establish performance on all laptops.

See [BUILD_STATE.md](BUILD_STATE.md), [DECISIONS.md](DECISIONS.md), and [KNOWN_GAPS.md](KNOWN_GAPS.md) for executed checks and limitations.
