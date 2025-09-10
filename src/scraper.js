// src/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeProductData(url) {
    try {
        const { data } = await axios.get(url, {
            headers: { 
                // A valid User-Agent is crucial to avoid being instantly blocked by Amazon
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        const $ = cheerio.load(data);

        // --- Selectors specifically for Amazon.in ---

        // 1. Product Title: Amazon's main product title reliably uses this ID.
        const title = $('#productTitle').text().trim();

        // 2. Description: The "About this item" bullet points are a rich source of compliance data.
        const description = $('#feature-bullets .a-list-item').text().trim();
        
        // 3. Image URL: This ID points to the main, high-resolution product image.
        const imageUrl = $('#landingImage').attr('src'); 

        if (!title || !imageUrl) {
            throw new Error('Could not find essential product details. The page layout might have changed or it might be a different type of page.');
        }

        return {
            title,
            description,
            imageUrl
        };

    } catch (error) {
        console.error(`Error scraping Amazon URL: ${error.message}`);
        throw new Error('Failed to scrape the provided Amazon URL. The site may be blocking the request or the page structure has changed.');
    }
}

module.exports = { scrapeProductData };