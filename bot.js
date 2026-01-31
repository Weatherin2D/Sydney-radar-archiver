const { chromium } = require("playwright");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

// Discord webhook from environment variable
const WEBHOOK_URL = process.env.WEBHOOK_URL;
if (!WEBHOOK_URL) throw new Error("WEBHOOK_URL is not set in environment variables");

// Websites to screenshot
const TARGET_URLS = [
"https://reg.bom.gov.au/products/IDR713.shtml",
"https://reg.bom.gov.au/products/IDR714.shtml",
"https://reg.bom.gov.au/products/IDR71I.shtml"
];

// The ID of the element to screenshot
const ELEMENT_ID = "map"; // change to your specific element ID

// Screenshot interval (6 minutes)
const INTERVAL = 6 * 60 * 1000;

async function takeScreenshotsAndSend() {
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const url of TARGET_URLS) {
try {
await page.goto(url, { waitUntil: "networkidle" });

// Select the element
const elementHandle = await page.$(`#${ELEMENT_ID}`);
if (!elementHandle) {
console.log(`❌ Element with ID "${ELEMENT_ID}" not found on ${url}`);
continue;
}

// Get UTC timestamp for file name
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const safeName = `${url.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.png`;
const filePath = path.join(__dirname, safeName);

// Screenshot the element
await elementHandle.screenshot({ path: filePath });

// Prepare Discord message
const form = new FormData();
form.append("content", `✅ Screenshot at ${timestamp} UTC`);
form.append("file", fs.createReadStream(filePath));

await fetch(WEBHOOK_URL, {
method: "POST",
body: form
});

console.log(`✅ Sent screenshot of ${url} at ${timestamp} UTC`);

// Delete local file after sending
fs.unlinkSync(filePath);

} catch (err) {
console.error(`❌ Error processing ${url}:`, err);
}
}

await browser.close();
}

// Run immediately
takeScreenshotsAndSend();

// Repeat every 6 minutes
setInterval(takeScreenshotsAndSend, INTERVAL);