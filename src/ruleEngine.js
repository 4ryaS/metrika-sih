// src/ruleEngine.js

function checkCompliance(scrapedData, ocrText) {
    const combinedText = `${scrapedData.title} ${scrapedData.description} ${ocrText}`.toLowerCase();
    
    let score = 0;
    const totalChecks = 6;
    const results = {};

    // 1. MRP Check (looks for "m.r.p", "mrp", "inclusive of all taxes")
    results.mrp = /m\.?r\.?p|inclusive of all taxes|maximum retail price/i.test(combinedText);
    if (results.mrp) score++;

    // 2. Net Quantity Check (looks for standard units like g, kg, ml, l, etc.)
    results.netQuantity = /\b(\d+)\s?(g|kg|ml|l|grams|kilograms|millilitres|litres)\b/i.test(combinedText);
    if (results.netQuantity) score++;

    // 3. Manufacturer/Importer Details Check
    results.manufacturerDetails = /manufactured by|marketed by|imported by/i.test(combinedText);
    if (results.manufacturerDetails) score++;

    // 4. Country of Origin Check
    results.countryOfOrigin = /country of origin\s*:\s*(\w+)/i.test(combinedText);
    if (results.countryOfOrigin) score++;

    // 5. Date of Manufacture/Import Check
    results.manufacturingDate = /mfg\.? date|date of manufacture|date of import/i.test(combinedText);
    if (results.manufacturingDate) score++;

    // 6. Consumer Care Details Check
    results.consumerCare = /consumer care|customer support|email:|contact/i.test(combinedText);
    if (results.consumerCare) score++;

    const complianceScore = (score / totalChecks) * 100;

    return {
        complianceScore: `${complianceScore.toFixed(2)}%`,
        checks: results
    };
}

module.exports = { checkCompliance };