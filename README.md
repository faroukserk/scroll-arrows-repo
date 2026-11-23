# Scroll Arrows

A gear-style scroll bar for every web page. Built for people whose mouse scroll wheel is broken, and for anyone who wants a more comfortable way to scroll.

## Features

- **Slides out on hover**, or stays fixed on screen
- **Three ways to scroll:** hover to scroll, click to navigate, or click and drag
- **Arrow buttons:** a click glides the page, and holding the button scrolls continuously
- **Double-click or double-tap** for rapid scrolling
- **Custom look:** opacity (down to 5%), thickness, length, scroll speed, edge position (left, right, top, bottom), accent color, glow, and an electric flicker effect
- **Mouse and touch** support
- **No data collection.** See [PRIVACY.md](PRIVACY.md).

## Install

### Option 1: Download the release (easiest)
1. Go to the [Releases](../../releases) page and download the latest `scroll-arrows.zip`.
2. Unzip it.
3. Open `chrome://extensions` in Chrome (or Edge, Brave, or another Chromium browser).
4. Turn on **Developer mode** (top right).
5. Click **Load unpacked** and select the unzipped folder.

### Option 2: Clone the repository
```bash
git clone https://github.com/YOUR-USERNAME/scroll-arrows.git
```
Then follow steps 3 to 5 above and select the cloned folder.

## Settings

Open the extension's settings from `chrome://extensions`: click **Details**, then **Extension options**. Changes apply immediately to open pages.

## Project structure

```
manifest.json   Extension manifest (Manifest V3)
content.js      Scroll bar behavior
style.css       Scroll bar appearance
options.html    Settings page
options.js      Settings logic
icons/          Extension icons
PRIVACY.md      Privacy policy
```

## License

MIT. See [LICENSE](LICENSE).
