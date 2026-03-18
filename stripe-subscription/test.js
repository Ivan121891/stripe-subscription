const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Catch all console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    // Catch all JS errors
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    
    // Catch all alerts
    page.on('dialog', async dialog => {
        console.log('ALERT DIALOG:', dialog.message());
        await dialog.dismiss();
    });

    console.log("Navigating to file...");
    await page.goto('file:///C:/Users/ROG/.gemini/antigravity/scratch/stripe-subscription/index.html', { waitUntil: 'networkidle2' });
    
    console.log("Typing amount...");
    await page.type('#calcAmount', '800');
    
    console.log("Clicking Get Options...");
    await page.click('#calcGetOptionsBtn');
    
    console.log("Clicking first tier option...");
    await page.waitForSelector('.tier-option');
    await page.click('.tier-option');
    
    console.log("Clicking Apply & Continue...");
    await page.waitForSelector('#calcContinueBtn:not([disabled])');
    await page.click('#calcContinueBtn');
    
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("Checking if payment section is visible...");
    const isVisible = await page.evaluate(() => {
        const el = document.getElementById('payment-section');
        return el && el.style.display === 'block';
    });
    console.log("Payment Section Visible:", isVisible);
    
    await browser.close();
})();
