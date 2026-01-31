const { chromium } = require("playwright");
const fetch = (...args) =>
import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fs = require("fs");
const FormData = require("form-data");

// ==============================
// CONFIG
// ==============================

// Discord webhook
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!WEBHOOK_URL) {
  throw new Error("WEBHOOK_URL is not set");
}

// Folder to store screenshots temporarily
const SCREENSHOT_DIR = "screenshots";

// Element ID to screenshot (same on all sites)
const ELEMENT_SELECTOR = "#content > table:nth-child(2) > tbody > tr > td > img"; // <-- change if needed

// Websites to monitor
const TARGETS = [
{
name: "Sydney_128KM",
url: "https://reg.bom.gov.au/products/IDR713.shtml",
},
{
name: "Sydney_64KM",
url: "https://reg.bom.gov.au/products/IDR714.shtml",
},
{
name: "Sydney_DOPPLER_128KM",
url: "https://reg.bom.gov.au/products/IDR71I.shtml",
},
];

// ==============================
// SETUP
// ==============================

// Ensure screenshot folder exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
fs.mkdirSync(SCREENSHOT_DIR);
}

// ==============================
// MAIN FUNCTION
// ==============================
async function takeScreenshotsAndSend() {
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const target of TARGETS) {
try {
await page.goto(target.url, { waitUntil: "networkidle" });

// Optional zoom for clarity
await page.evaluate(() => {
document.body.style.zoom = "150%";
});

// Wait for the specific element
const element = await page.waitForSelector(ELEMENT_SELECTOR, {
timeout: 15000,
});

// UTC timestamp
const timestamp = new Date().toISOString().replace(/[:]/g, "-");

// Filename
const filePath = `${SCREENSHOT_DIR}/${target.name}_${timestamp}.png`;

// Screenshot ONLY the element
await element.screenshot({ path: filePath });

// Send to Discord (clean message)
const form = new FormData();
form.append("content", `TIME: ${timestamp} UTC`);
form.append("file", fs.createReadStream(filePath));

await fetch(WEBHOOK_URL, {
method: "POST",
body: form,
});

console.log(`✅ Sent ${target.name} at ${timestamp}`);

// Delete local file after sending
fs.unlink(filePath, () => {});
} catch (err) {
console.error(`❌ Failed for ${target.name}:`, err.message);
}
}

await browser.close();
}

// ==============================
// RUN + LOOP
// ==============================

// Run immediately
takeScreenshotsAndSend();

// Repeat every 6 minutes
setInterval(takeScreenshotsAndSend, 6 * 60 * 1000);
