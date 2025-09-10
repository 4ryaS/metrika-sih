// src/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Parses the "Product Details" or "Additional Information" table on an Amazon page.
 * @param {cheerio.CheerioAPI} $ - The Cheerio instance.
 * @returns {object} A key-value map of the product details.
 */
function parseProductDetails($) {
    const details = {};
    const detailTable = $('#productDetails_detailBullets_sections1').length ? 
                        $('#productDetails_detailBullets_sections1') : 
                        $('#detailBullets_feature_div');

    detailTable.find('tr').each((i, el) => {
        const key = $(el).find('th').text().trim().toLowerCase().replace(/\s+/g, '_');
        const value = $(el).find('td').text().trim();
        if (key && value) {
            details[key] = value;
        }
    });
    return details;
}

async function scrapeProductData(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        const $ = cheerio.load(data);

        const title = $('#productTitle').text().trim();
        const brand = $('#bylineInfo').text().trim().replace(/^Visit the |^Shop | Store$/g, '');
        
        const price = $('.a-price-whole').first().text().trim() + $('.a-price-fraction').first().text().trim();
        const ratingText = $('#acrPopover').attr('title');
        const reviewCount = $('#acrCustomerReviewText').text().trim();

        const features = [];
        $('#feature-bullets .a-list-item').each((i, el) => {
            features.push($(el).text().trim());
        });

        const imageUrls = [];
        $('#altImages .a-button-input').each((i, el) => {
            const thumbUrl = $(el).closest('.a-button-inner').find('img').attr('src');
            if (thumbUrl && !thumbUrl.includes('play-icon')) {
                const highResUrl = thumbUrl.replace(/\._.*_\./, '._AC_SL1500_.');
                imageUrls.push(highResUrl);
            }
        });
        
        if (imageUrls.length === 0) {
            const mainImage = $('#landingImage').attr('src');
            if (mainImage) imageUrls.push(mainImage.replace(/\._.*_\./, '._AC_SL1500_.'));
        }

        const productDetails = parseProductDetails($);

        return {
            title,
            brand,
            price: price ? `₹${price}` : 'N/A',
            rating: ratingText,
            reviewCount,
            features,
            productDetails,
            imageUrls,
        };

    } catch (error) {
        console.error(`Error scraping Amazon URL: ${error.message}`);
        throw new Error('Failed to scrape the provided Amazon URL. The site may be blocking the request or the page structure has changed.');
    }
}

module.exports = { scrapeProductData };