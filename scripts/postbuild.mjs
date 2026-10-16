import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

// Generate dist/en/index.html from the built dist/index.html (zh).
// Vite base is global (./), so the en/ subpage must use ../assets/ to reach dist/assets/.
const src = "dist/index.html";
if (!existsSync(src)) {
  console.warn("[postbuild] dist/index.html not found; skipping en page generation");
  process.exit(0);
}
let html = readFileSync(src, "utf8");

// 1. language
html = html.replace('lang="zh-CN"', 'lang="en"');

// 2. asset paths: main page uses ./assets/, en/ subpage needs ../assets/
html = html.replaceAll("./assets/", "../assets/");

// 3. head meta tags -> English
html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>ScreenAwake - Free Online Keep Screen Awake Tool | No Install, PC &amp; Mobile</title>');
html = html.replace(/<meta name="description" [^>]*>/, '<meta name="description" content="Keep your screen awake and stop auto-sleep with ScreenAwake. Free, no install, one click to keep your screen on for streaming, online classes, remote work, downloads and gaming." />');
html = html.replace(/<link rel="canonical" [^>]*>/, '<link rel="canonical" href="https://lsiten.github.io/ScreenAwake/en/" />');
html = html.replace(/<meta property="og:title" [^>]*>/, '<meta property="og:title" content="ScreenAwake - Free Online Keep Screen Awake Tool" />');
html = html.replace(/<meta property="og:description" [^>]*>/, '<meta property="og:description" content="Keep your screen awake and stop auto-sleep with ScreenAwake. Free, no install, one click to keep your screen on." />');
html = html.replace(/<meta property="og:url" [^>]*>/, '<meta property="og:url" content="https://lsiten.github.io/ScreenAwake/en/" />');
html = html.replace(/<meta property="og:locale" [^>]*>/, '<meta property="og:locale" content="en_US" />');
html = html.replace(/<meta name="twitter:title" [^>]*>/, '<meta name="twitter:title" content="ScreenAwake - Free Online Keep Screen Awake Tool" />');
html = html.replace(/<meta name="twitter:description" [^>]*>/, '<meta name="twitter:description" content="Keep your screen awake and stop auto-sleep with ScreenAwake. Free, no install, one click to keep your screen on." />');

// 4. JSON-LD (3 blocks) -> English
const ldEn = [
  `<script type="application/ld+json">\n{"@context":"https://schema.org","@type":"SoftwareApplication","name":"ScreenAwake","applicationCategory":"UtilitiesApplication","operatingSystem":"Windows, macOS, Linux, Android, iOS","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"description":"Free browser-based keep-screen-awake tool. Prevents your monitor and system from auto-sleeping; for streaming, online classes, remote work, downloads and gaming."}\n</script>`,
  `<script type="application/ld+json">\n{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[\n  {"@type":"Question","name":"Does ScreenAwake work on mobile?","acceptedAnswer":{"@type":"Answer","text":"Yes. Open ScreenAwake in any mobile browser to keep your screen awake, no app install needed."}},\n  {"@type":"Question","name":"Does keeping the screen on drain the battery?","acceptedAnswer":{"@type":"Answer","text":"Slightly more than usual, but ScreenAwake itself is very light; use the timer to stop it when you're done."}},\n  {"@type":"Question","name":"Do I need an internet connection?","acceptedAnswer":{"@type":"Answer","text":"You need a connection to load it first. Once loaded it keeps working as long as the tab stays open, even if the connection is unstable."}},\n  {"@type":"Question","name":"Will it change my system settings?","acceptedAnswer":{"@type":"Answer","text":"No. ScreenAwake only blocks sleep temporarily and doesn't modify your power settings; it reverts when closed."}}\n]}\n</script>`,
  `<script type="application/ld+json">\n{"@context":"https://schema.org","@type":"HowTo","name":"How to keep your screen awake with ScreenAwake","step":[\n  {"@type":"HowToStep","position":1,"name":"Open the tool","text":"Visit ScreenAwake in any browser, no sign-up, download or install."},\n  {"@type":"HowToStep","position":2,"name":"Set a duration","text":"Choose 30 minutes, 1 hour, 3 hours or Always On."},\n  {"@type":"HowToStep","position":3,"name":"Keep awake","text":"Click Keep Screen On to keep your screen awake; click again to stop."}\n]}\n</script>`,
].join("\n");
html = html.replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*<script type="application\/ld\+json">[\s\S]*?<\/script>\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  ldEn,
);

// 5. SEO content block -> English
const contentEn = `<div class="seo-content" id="seo-content">
  <section><h2>What is ScreenAwake?</h2><p>ScreenAwake is a browser-based keep-screen-awake tool. No download, no install, completely free. A single click keeps your screen on and prevents your monitor or system from auto-sleeping while you work. It only blocks sleep temporarily and never changes your power settings. Works on Windows, Mac, Linux and mobile browsers.</p></section>
  <section><h2>Why Choose ScreenAwake?</h2><ul>
    <li><strong>No install</strong> - opens in your browser, uses no system resources.</li>
    <li><strong>100% free</strong> - no membership, no hidden fees.</li>
    <li><strong>Cross-platform</strong> - Windows, Mac, Linux, Android and iOS browsers.</li>
    <li><strong>Flexible timer</strong> - 30 min, 1 hour, 3 hours or always on; stop when done.</li>
    <li><strong>Privacy-first</strong> - we don't collect or store your usage data.</li>
  </ul></section>
  <section><h2>Use Cases</h2>
    <h3>Keep screen awake while streaming</h3><p>Stay on air without the screen going black or the stream dropping - built for streamers and content creators.</p>
    <h3>Keep screen awake for online classes</h3><p>Stay on during online classes, e-learning or long reading sessions so you never lose your place.</p>
    <h3>Keep screen awake for video calls</h3><p>Stay visible in video calls, remote work or screen sharing - no more screen blackout mid-meeting.</p>
    <h3>Keep screen awake for downloads</h3><p>Keep the screen on while downloading large files or apps and monitor progress without interruption.</p>
    <h3>Keep screen awake for gaming</h3><p>Stay active while gaming or waiting for loads so your tasks keep running.</p>
  </section>
  <section><h2>How to Use ScreenAwake</h2>
    <p><strong>Step 1: Open the tool.</strong> Visit ScreenAwake in any browser - no sign-up, download or install.</p>
    <p><strong>Step 2: Set a duration.</strong> Choose 30 minutes, 1 hour, 3 hours or "Always On".</p>
    <p><strong>Step 3: Keep awake.</strong> Click "Keep Screen On"; click again to stop.</p>
  </section>
  <section><h2>FAQ</h2>
    <details><summary>Does ScreenAwake work on mobile?</summary><p>Yes. Open ScreenAwake in any mobile browser to keep your screen awake - no app install needed.</p></details>
    <details><summary>Does keeping the screen on drain the battery?</summary><p>Slightly more than usual, but ScreenAwake itself is very light. Use the timer to stop it when you're done.</p></details>
    <details><summary>Do I need an internet connection?</summary><p>You need a connection to load it first. Once loaded, it keeps working as long as the tab stays open, even if the connection is unstable.</p></details>
    <details><summary>Will it change my system settings?</summary><p>No. ScreenAwake only blocks sleep temporarily and doesn't modify your power settings; it reverts when closed.</p></details>
  </section>
</div>`;
html = html.replace(/<div class="seo-content" id="seo-content">[\s\S]*?<\/div>/, contentEn);

// write
mkdirSync("dist/en", { recursive: true });
writeFileSync("dist/en/index.html", html, "utf8");
console.log("[postbuild] wrote dist/en/index.html");
