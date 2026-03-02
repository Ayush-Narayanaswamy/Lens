# Lens Chrome Extension

Lens is a browser helper that checks the page you are on and gives you simple signals for:
- Reliability (how trustworthy the page looks)
- Bias score (1 to 100)
- Risk level (Low, Medium, High)
- Short explanation of why it was flagged

In shorthand, "Lens" is a fake news detector that as a Chrome side-panel give users an instant credibility check on any article page by combining transparent rule-based analysis with lightweight AI explanation: the extension reads the visible page content (headline, body text, source domain, metadata like author/date, and citation links), then computes a reliability score, a 1–100 bias score, and a risk level using deterministic signals such as source reputation profiles, sensational-language detection, citation depth, and transparency indicators so users can see consistent, explainable outputs rather than black-box predictions; the product is built with a modern TypeScript stack (React UI, Vite build pipeline, and a Manifest V3 Chrome runtime with content scripts + background worker), stores local history in browser storage for fast repeat checks, and uses Ollama Cloud API for a short natural-language summaries on why the current source was flagged or passed as reputable.

## What this project does

When you click Analyze, Lens reads visible text on the current page and checks things like:
- Source quality profile
- Sensational wording
- Citation depth
- Basic transparency signals (author/date)

## Get the code

Repository link:
https://github.com/Ayush-Narayanaswamy/Lens

Clone it:

```bash
git clone https://github.com/Ayush-Narayanaswamy/Lens.git
cd Lens
```

## Install and build (simple)

1. Install Node.js LTS from https://nodejs.org
2. In the project folder, run:

```bash
npm install
npm run build
```

This creates a dist folder with the extension files.

## Add Lens to Chrome

1. Open Chrome and go to:
   chrome://extensions
2. Turn on Developer mode (top right)
3. Click Load unpacked
4. Select the dist folder from this project
5. Pin Lens from the Extensions menu

## How to use

1. Open any news/article page
2. Click the Lens icon
3. Click Analyze this page
4. Read:
   - Reliability score
   - Bias percentage
   - Confidence
   - Risk level
   - Why flagged list

You can also open History from inside Lens
