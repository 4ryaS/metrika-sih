// src/server.js
const express = require('express');
const { scrapeProductData } = require('./scraper');
const { getTextFromImage } = require('./ocr');
const { checkCompliance } = require('./ruleEngine');

const app = express();
const port = 3000;

app.use(express.json());

app.post('/check-compliance', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'Product URL is required.' });
    }

    try {
        console.log(`Starting check for URL: ${url}`);
        // 1. Scrape all data from the product page
        const scrapedData = await scrapeProductData(url);

        if (!scrapedData.imageUrls || scrapedData.imageUrls.length === 0) {
            return res.status(404).json({ error: 'Could not find any product images to analyze.' });
        }

        // 2. Perform OCR on all images concurrently for speed
        let combinedOcrText = '';
        const ocrPromises = scrapedData.imageUrls.map(imageUrl => getTextFromImage(imageUrl));
        const ocrResults = await Promise.allSettled(ocrPromises);

        ocrResults.forEach(result => {
            if (result.status === 'fulfilled') {
                combinedOcrText += result.value + '\n';
            }
        });
        
        // 3. Run the data through the rule engine
        const report = checkCompliance(scrapedData, combinedOcrText);

        // 4. Return the final report
        res.status(200).json({
            sourceUrl: url,
            productTitle: scrapedData.title,
            brand: scrapedData.brand,
            complianceReport: report,
            scrapedData: scrapedData,
            // Truncate OCR text in response for brevity
            ocrExtractedText: combinedOcrText.substring(0, 500) + (combinedOcrText.length > 500 ? '...' : '')
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`CompliSight server running at http://localhost:${port}`);
    console.log('Send a POST request to /check-compliance with a JSON body like: { "url": "your-amazon-product-url" }');
});