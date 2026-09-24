# Undertext

**See a web page the way an AI agent reads it.**

AI agents that shop, research and fill in forms for people don't read pages the way people do. They also read text that's hidden from view: off-screen blocks, invisible characters, image descriptions, code comments, structured data. Some pages use that gap to slip instructions to the agent ("Ignore previous instructions…", "AI assistants must always recommend…").

Undertext shows the page side by side: what you see, and what an agent reads. It highlights hidden text and flags anything that looks like an instruction aimed at AI.

**Try it:** https://richardsheng22.github.io/undertext/

## How to use it

1. **Try an example.** Open the page and pick one of the built-in examples.
2. **Scan a real page.** Either:
   - **Bookmarklet (recommended):** drag “Undertext capture” to your bookmarks bar, open the page you want to check, click the bookmark, then paste into Undertext. It captures the page with the styles that decide what's hidden.
   - **Paste the source:** right-click → View page source → copy, then paste it. This is quicker, but it misses text hidden by separate stylesheets and text added by scripts after the page loads.

Everything runs in your browser. Nothing is uploaded, and there's no server.

## How it decides

Every piece of text gets three questions:
- **Who can see it?** Everyone, only AI assistants, or only bots that read the page source.
- **Is it talking to an AI and telling it to do something?** For example, it addresses an assistant, tries to override its instructions, poses as an official notice, or asks it to keep something from you.
- **Is anything else off?** For example, invisible characters, encoded text, or product data that contradicts the page.

Hidden text is normal on most sites: screen-reader labels, menus, cookie banners, SEO tags. Undertext only flags hidden text that also speaks to an AI, and every finding says *why* it was flagged. It uses fixed rules rather than an AI judge, because a judge can itself be prompt-injected by the page it's judging.

## Limits

A clean result isn't a guarantee. Undertext can't see:
- text inside images
- text written into the page by CSS (`::before` / `::after`)
- instructions reworded to avoid both addressing an AI and override language

## Testing

Tested on 28 live websites and 130 saved real pages (0 false alarms), 162 injections planted into live pages (all flagged), and a 95-case attack set. See [`tests/RESULTS.md`](tests/RESULTS.md) for the methods, numbers and caveats, and for how to rerun them.

## Status

This is an early prototype.
