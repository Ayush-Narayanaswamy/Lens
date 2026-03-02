# Lens Chrome Extension

Lens is a browser helper that checks the page you are on and gives you simple signals for:
- Reliability (how trustworthy the page looks)
- Bias score (1 to 100)
- Risk level (Low, Medium, High)
- Short explanation of why it was flagged

It is an assistant, not a final truth judge.

## What this project does

When you click Analyze, Lens reads visible text on the current page and checks things like:
- Source quality profile
- Sensational wording
- Citation depth
- Basic transparency signals (author/date)

It can also add an AI explanation (Ollama), but the core scoring works without AI.

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

Now click the Lens icon. It opens on the right side.

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

You can also open History from inside Lens.

## Optional AI explanation setup

Lens can call Ollama for a natural language explanation.

1. Copy .env.example to .env
2. Fill values you want (local Ollama or Ollama cloud)
3. Rebuild:

```bash
npm run build
```

4. Reload Lens in chrome://extensions

## Notes

- This tool is for guidance only.
- Always cross-check important claims with multiple sources.
- Keep your .env private. Do not upload it to GitHub.

## Troubleshooting

If Lens does not update after changes:
1. Run npm run build again
2. Go to chrome://extensions
3. Click Reload on Lens

If AI explanation says skipped:
- Your endpoint/key/model may be wrong, or rate limit was hit
- Core reliability and bias scoring will still work
