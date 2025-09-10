// scraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const Tesseract = require('tesseract.js');

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

        // Enhanced title extraction with multiple fallbacks
        let title = '';
        const titleSelectors = [
            '#productTitle',
            'h1.a-size-large',
            'h1[data-automation-id="product-title"]',
            '.product-title',
            'h1',
            '[data-asin] h1',
            '.a-size-large.a-spacing-none.a-color-base'
        ];

        for (const selector of titleSelectors) {
            title = $(selector).first().text().trim();
            if (title && title.length > 0) break;
        }

        // Enhanced description extraction from multiple sources
        let description = '';

        // 1. Feature bullets (About this item) - Most common location
        const featureBulletsSelectors = [
            '#feature-bullets ul li span',
            '#feature-bullets .a-list-item',
            '[data-feature-name="featurebullets"] ul li',
            '.a-unordered-list.a-vertical.a-spacing-mini li span'
        ];

        let featureBullets = '';
        for (const selector of featureBulletsSelectors) {
            const bullets = $(selector).map((i, el) => $(el).text().trim()).get();
            if (bullets.length > 0) {
                featureBullets = bullets.join(' ');
                break;
            }
        }

        // 2. Product details section
        const productDetailsSelectors = [
            '#productDetails_detailBullets_sections1 tr',
            '#detailBullets_feature_div tr',
            '.pdTab tr',
            '#productDetails_db_sections tr'
        ];

        let productDetails = '';
        for (const selector of productDetailsSelectors) {
            const details = $(selector).map((i, el) => {
                const key = $(el).find('td:first-child, th').text().trim();
                const value = $(el).find('td:last-child').text().trim();
                return key && value ? `${key}: ${value}` : '';
            }).get().filter(text => text.length > 0);

            if (details.length > 0) {
                productDetails = details.join(' ');
                break;
            }
        }

        // 3. Technical specifications
        let technicalDetails = '';
        const techSelectors = [
            '#productDetails_techSpec_section_1 tr',
            '.a-keyvalue tr',
            '#tech-spec-table tr'
        ];

        for (const selector of techSelectors) {
            const specs = $(selector).map((i, el) => {
                const key = $(el).find('td:first-child, th').text().trim();
                const value = $(el).find('td:last-child').text().trim();
                return key && value ? `${key}: ${value}` : '';
            }).get().filter(text => text.length > 0);

            if (specs.length > 0) {
                technicalDetails = specs.join(' ');
                break;
            }
        }

        // 4. Product description and A+ content
        const descriptionSelectors = [
            '#productDescription p',
            '#aplus_feature_div',
            '.a-section.a-spacing-medium',
            '[data-feature-name="aplus"]'
        ];

        let productDescription = '';
        for (const selector of descriptionSelectors) {
            productDescription = $(selector).text().trim();
            if (productDescription && productDescription.length > 50) break;
        }

        // 5. Important information section
        const importantInfoSelectors = [
            '#important-information',
            '.important-information',
            '[data-feature-name="importantInformation"]'
        ];

        let importantInfo = '';
        for (const selector of importantInfoSelectors) {
            importantInfo = $(selector).text().trim();
            if (importantInfo && importantInfo.length > 0) break;
        }

        // 6. Additional product information
        let additionalInfo = '';
        const additionalSelectors = [
            '#productDetails_db_sections',
            '.prodDetSectionEntry',
            '.cr-product-details'
        ];

        for (const selector of additionalSelectors) {
            additionalInfo = $(selector).text().trim();
            if (additionalInfo && additionalInfo.length > 0) break;
        }

        // Combine all description sources
        description = [
            featureBullets,
            productDetails,
            technicalDetails,
            productDescription,
            importantInfo,
            additionalInfo
        ].filter(text => text && text.length > 0).join(' ');

        // Enhanced image extraction - Get ALL product images (excluding videos)
        const allImages = [];
        const imageSelectors = [
            '#landingImage',
            '.a-dynamic-image',
            '#imgTagWrapperId img',
            '#imageBlock img',
            '#altImages img',
            '.a-button-thumbnail img',
            '#imageBlockThumbs img',
            '#imageBlock_feature_div img',
            '.a-carousel-container img',
            '[data-old-hires]'
        ];

        // Get main product image first
        let imageUrl = '';
        for (const selector of imageSelectors) {
            const $img = $(selector).first();
            imageUrl = $img.attr('data-old-hires') || $img.attr('src') || $img.attr('data-src');
            if (imageUrl && imageUrl.includes('images-amazon')) break;
        }

        // Collect all unique product images (avoid duplicates and videos)
        const imageUrls = new Set();

        imageSelectors.forEach(selector => {
            $(selector).each((i, el) => {
                const $el = $(el);
                const src = $el.attr('data-old-hires') ||
                    $el.attr('src') ||
                    $el.attr('data-src') ||
                    $el.attr('data-a-dynamic-image');

                if (src &&
                    (src.includes('images-amazon') || src.includes('ssl-images-amazon')) &&
                    !src.includes('video') &&
                    !src.includes('.mp4') &&
                    !src.includes('transparent-pixel') &&
                    !src.includes('1x1') &&
                    src.length > 50) {

                    // Get high resolution version if available
                    let highResSrc = src;
                    if (src.includes('._') && src.includes('_.')) {
                        // Remove size restrictions to get original image
                        highResSrc = src.replace(/\._[^_.]*_\./g, '.');
                    }
                    imageUrls.add(highResSrc);
                }
            });
        });

        // Also check for images in JSON-LD data
        try {
            const imageJsonMatch = data.match(/"colorImages":\{[^}]*"initial":\[([^\]]+)\]/);
            if (imageJsonMatch) {
                const imageData = imageJsonMatch[1];
                const imageMatches = imageData.match(/"large":"([^"]+)"/g);
                if (imageMatches) {
                    imageMatches.forEach(match => {
                        const url = match.match(/"large":"([^"]+)"/)[1];
                        if (url) imageUrls.add(url.replace(/\\u002F/g, '/'));
                    });
                }
            }
        } catch (e) {
            console.log('Could not extract images from JSON data');
        }

        allImages.push(...Array.from(imageUrls));

        // Price information extraction
        let price = '';
        let mrp = '';

        const priceSelectors = [
            '.a-price-whole',
            '.a-offscreen',
            '.a-price .a-offscreen',
            '#price_inside_buybox'
        ];

        for (const selector of priceSelectors) {
            const priceText = $(selector).first().text().trim();
            if (priceText && priceText.includes('₹')) {
                price = priceText;
                break;
            }
        }

        // MRP extraction
        mrp = $('.a-price-whole').first().text().trim() + $('.a-price-fraction').first().text().trim();
        // $('.a-text-price .a-offscreen, .a-price.a-text-price .a-offscreen').each((i, el) => {
        //     const text = $(el).text().trim();
        //     if (text && text.includes('₹')) {
        //         mrp = text;
        //         return false; // break
        //     }
        // });

        // Brand information
        let brand = '';
        const brandSelectors = [
            '#bylineInfo',
            '.a-link-normal[data-hook="product-link"]',
            '.po-brand .po-break-word',
            '#brand'
        ];

        for (const selector of brandSelectors) {
            brand = $(selector).text().trim().replace(/^Visit the |Brand: /i, '');
            if (brand && brand.length > 0) break;
        }

        // ASIN extraction
        let asin = '';
        const asinMatch = data.match(/"ASIN":"([A-Z0-9]{10})"/);
        if (asinMatch) {
            asin = asinMatch[1];
        }

        // Validate that we have essential data
        if (!title || title.length < 5) {
            console.log('Debug info:');
            console.log('Title selectors tried:', titleSelectors);
            console.log('Found titles:', titleSelectors.map(sel => $(sel).text().trim()));
            console.log('Page contains productTitle:', $('#productTitle').length > 0);
            console.log('Page HTML length:', data.length);

            throw new Error('Could not extract product title. This might not be a valid Amazon product page, or Amazon is blocking the request.');
        }

        console.log(`Found ${allImages.length} product images for OCR processing`);

        // Perform OCR on all images and check compliance
        const ocrResults = await performOCROnImages(allImages);

        return {
            title,
            description,
            imageUrl,
            allImages,
            price,
            mrp,
            brand,
            asin,
            url,
            ocrText: ocrResults.combinedText,
            ocrDetails: ocrResults.imageResults,
            rawHtml: data.substring(0, 1000) // First 1000 chars for debugging
        };

    } catch (error) {
        console.error(`Error scraping Amazon URL: ${error.message}`);

        if (error.code === 'ENOTFOUND') {
            throw new Error('Network error: Could not connect to Amazon. Please check your internet connection.');
        } else if (error.code === 'ETIMEDOUT') {
            throw new Error('Request timeout: Amazon took too long to respond. Please try again.');
        } else if (error.response && error.response.status === 503) {
            throw new Error('Amazon is temporarily blocking requests (503 error). Please wait and try again with different headers.');
        } else if (error.response && error.response.status === 404) {
            throw new Error('Product page not found (404). Please verify the Amazon URL is correct.');
        } else {
            throw new Error(`Failed to scrape the Amazon URL: ${error.message}`);
        }
    }
}

// Function to perform OCR on multiple images
async function performOCROnImages(imageUrls, maxImages = 10) {
    const results = {
        combinedText: '',
        imageResults: [],
        processedCount: 0,
        errors: []
    };

    if (!imageUrls || imageUrls.length === 0) {
        console.log('No images found for OCR processing');
        return results;
    }

    // Limit the number of images to process (to avoid excessive processing time)
    const imagesToProcess = imageUrls.slice(0, maxImages);
    console.log(`Starting OCR processing for ${imagesToProcess.length} images...`);

    for (let i = 0; i < imagesToProcess.length; i++) {
        try {
            console.log(`Processing image ${i + 1}/${imagesToProcess.length}: ${imagesToProcess[i].substring(0, 100)}...`);

            const ocrResult = await Tesseract.recognize(imagesToProcess[i], 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress for image ${i + 1}: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            const extractedText = ocrResult.data.text.trim();

            if (extractedText && extractedText.length > 10) {
                results.imageResults.push({
                    imageUrl: imagesToProcess[i],
                    text: extractedText,
                    confidence: ocrResult.data.confidence
                });

                results.combinedText += ' ' + extractedText;
                results.processedCount++;

                console.log(`Image ${i + 1} OCR completed. Extracted ${extractedText.length} characters (confidence: ${Math.round(ocrResult.data.confidence)}%)`);
            } else {
                console.log(`Image ${i + 1}: No meaningful text found`);
            }

        } catch (error) {
            console.error(`OCR failed for image ${i + 1}:`, error.message);
            results.errors.push({
                imageUrl: imagesToProcess[i],
                error: error.message
            });
        }
    }

    results.combinedText = results.combinedText.trim();
    console.log(`OCR processing completed. Total text extracted: ${results.combinedText.length} characters from ${results.processedCount} images`);

    return results;
}

// Function to scrape and check compliance in one go
async function scrapeAndCheckCompliance(url) {
    try {
        // Import the rule engine
        const { checkCompliance } = require('./ruleEngine');

        // Scrape the product data (including OCR)
        console.log('Starting product data scraping...');
        const scrapedData = await scrapeProductData(url);

        // Check compliance using the scraped data and OCR text
        console.log('Checking compliance...');
        const complianceResult = checkCompliance(scrapedData, scrapedData.ocrText);

        return {
            productData: scrapedData,
            compliance: complianceResult,
            summary: {
                title: scrapedData.title,
                imagesProcessed: scrapedData.ocrDetails.length,
                ocrTextLength: scrapedData.ocrText.length,
                complianceScore: complianceResult.complianceScore,
                complianceLevel: complianceResult.complianceLevel
            }
        };

    } catch (error) {
        throw new Error(`Scraping and compliance check failed: ${error.message}`);
    }
}

// Utility function to test if URL is valid Amazon.in product page
function isValidAmazonUrl(url) {
    const amazonPatterns = [
        /amazon\.in\/.*\/dp\/[A-Z0-9]{10}/,
        /amazon\.in\/dp\/[A-Z0-9]{10}/,
        /amazon\.in\/.*\/gp\/product\/[A-Z0-9]{10}/
    ];

    return amazonPatterns.some(pattern => pattern.test(url));
}

// Function to clean and normalize URLs
function normalizeAmazonUrl(url) {
    // Remove ref and other tracking parameters
    const cleanUrl = url.split(/[?&#]/)[0];

    // Extract ASIN and construct clean URL
    const asinMatch = cleanUrl.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
    if (asinMatch) {
        const asin = asinMatch[1] || asinMatch[2];
        return `https://www.amazon.in/dp/${asin}`;
    }

    return url;
}

module.exports = {
    scrapeProductData,
    performOCROnImages,
    scrapeAndCheckCompliance,
    isValidAmazonUrl,
    normalizeAmazonUrl
};