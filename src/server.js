// src/server.js
const express = require('express');
const { scrapeProductData } = require('./scraper');
const { getTextFromImage } = require('./ocr');
const { checkCompliance } = require('./ruleEngine');

const app = express();
const port = 3000;

app.use(express.json());

// API Endpoint to check compliance
app.post('/check-compliance', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Product URL is required.' });
    }

    try {
        // Step 1: Scrape text and image URL from the product page
        console.log(`Starting check for URL: ${url}`);
        const scrapedData = await scrapeProductData(url);

        if (!scrapedData.imageUrl) {
            return res.status(404).json({ error: 'Could not find a product image to analyze.' });
        }

        // Step 2: Perform OCR on the scraped image
        const ocrText = await getTextFromImage(scrapedData.imageUrl);

        // Step 3: Run the combined data through the rule engine
        const report = checkCompliance(scrapedData, ocrText);

        // Step 4: Return the final report
        res.status(200).json({
            sourceUrl: url,
            scrapedData: {
                title: scrapedData.title,
                description: scrapedData.description.substring(0, 200) + '...', // Truncate for brevity
                imageUrl: scrapedData.imageUrl
            },
            ocrExtractedText: ocrText.substring(0, 300) + '...', // Truncate
            complianceReport: report
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`CompliSight server is running at http://localhost:${port}`);
});