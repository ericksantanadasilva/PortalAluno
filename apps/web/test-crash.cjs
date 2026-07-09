const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
    
    console.log("Navigating...");
    await page.goto('http://localhost:3000/dashboard/boletim', {waitUntil: 'networkidle2'});
    
    console.log("Waiting for trigger...");
    await page.waitForSelector('[data-slot="dropdown-menu-trigger"]');
    
    console.log("Clicking trigger...");
    await page.click('[data-slot="dropdown-menu-trigger"]');
    
    console.log("Waiting for 2 seconds to see errors...");
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
    console.log("Done");
  } catch (err) {
    console.error("SCRIPT ERROR:", err);
  }
})();
