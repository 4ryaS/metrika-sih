// src/ruleEngine.js

function checkCompliance(scrapedData, ocrText) {
    const results = {};
    let score = 0;
    const totalChecks = 6;

    // Combine all unstructured text for fallback searching
    const combinedText = `
        ${scrapedData.title} 
        ${scrapedData.brand} 
        ${scrapedData.features.join(' ')} 
        ${Object.values(scrapedData.productDetails).join(' ')}
        ${ocrText}
    `.toLowerCase();

    // 1. MRP (Check scraped price and text for "inclusive of all taxes")
    results.mrp = !!scrapedData.price.startsWith('₹') || /m\.?r\.?p|inclusive of all taxes|maximum retail price/i.test(combinedText);
    if (results.mrp) score++;
    
    // 2. Net Quantity (Prioritize structured data)
    results.netQuantity = !!scrapedData.productDetails.net_quantity || /\b(\d+)\s?(g|kg|ml|l|grams|kilograms|millilitres|litres|count|pieces|pack)\b/i.test(combinedText);
    if (results.netQuantity) score++;
    
    // 3. Manufacturer/Importer Details (Prioritize structured data)
    results.manufacturerDetails = !!scrapedData.productDetails.manufacturer || /manufactured by|marketed by|imported by/i.test(combinedText);
    if (results.manufacturerDetails) score++;

    // 4. Country of Origin (Prioritize structured data)
    results.countryOfOrigin = !!scrapedData.productDetails.country_of_origin || /country of origin\s*:\s*(\w+)/i.test(combinedText);
    if (results.countryOfOrigin) score++;

    // 5. Date of Manufacture/Import (Text search only)
    results.manufacturingDate = /mfg\.? date|date of manufacture|date of import|best before/i.test(combinedText);
    if (results.manufacturingDate) score++;
    
    // 6. Consumer Care Details (Text search only)
    results.consumerCare = /consumer care|customer support|email:|contact:|for queries/i.test(combinedText);
    if (results.consumerCare) score++;

    const complianceScore = (score / totalChecks) * 100;

    return {
        complianceScore: `${complianceScore.toFixed(2)}%`,
        summary: {
            mrp: results.mrp ? "✅ Found" : "❌ Not Found",
            netQuantity: results.netQuantity ? "✅ Found" : "❌ Not Found",
            manufacturerDetails: results.manufacturerDetails ? "✅ Found" : "❌ Not Found",
            countryOfOrigin: results.countryOfOrigin ? "✅ Found" : "❌ Not Found",
            manufacturingDate: results.manufacturingDate ? "✅ Found" : "❌ Not Found",
            consumerCare: results.consumerCare ? "✅ Found" : "❌ Not Found",
        },
        details: results
    };
}

module.exports = { checkCompliance };