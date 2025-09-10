// ruleEngine.js

function checkCompliance(scrapedData, ocrText = '') {
    const combinedText = `${scrapedData.title} ${scrapedData.description} ${ocrText}`.toLowerCase();
    
    let score = 0;
    const totalChecks = 7;
    const results = {};
    const details = {};

    // 1. Manufacturer/Packer Details Check
    const manufacturerPatterns = [
        /manufactured\s+by[:\s]+([^,\n]+)/i,
        /marketed\s+by[:\s]+([^,\n]+)/i,
        /packed\s+by[:\s]+([^,\n]+)/i,
        /packer[:\s]+([^,\n]+)/i,
        /mfd\s*by[:\s]+([^,\n]+)/i,
        /mkt\s*by[:\s]+([^,\n]+)/i,
        /manufacturer[:\s]+([^,\n]+)/i
    ];
    
    results.manufacturerDetails = manufacturerPatterns.some(pattern => pattern.test(combinedText));
    if (results.manufacturerDetails) {
        score++;
        const match = manufacturerPatterns.find(pattern => pattern.test(combinedText));
        if (match) {
            const found = combinedText.match(match);
            details.manufacturerDetails = found ? found[1].trim() : 'Found';
        }
    }

    // 2. Net Quantity Declaration Check
    const netQuantityPatterns = [
        /net\s+(?:quantity|wt|weight)[:\s]*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gms|grams|kilograms|millilitres|litres|oz|pounds|lbs)/i,
        /(?:net\s+)?(?:wt|weight)[:\s]*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gms|grams|kilograms|millilitres|litres)/i,
        /(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gms|grams|kilograms|millilitres|litres)\s+(?:net|pack)/i,
        /quantity[:\s]*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|pieces|pcs|units)/i,
        /pack of\s+(\d+)/i,
        /contains[:\s]*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|pieces|units)/i
    ];
    
    results.netQuantity = netQuantityPatterns.some(pattern => pattern.test(combinedText));
    if (results.netQuantity) {
        score++;
        const match = netQuantityPatterns.find(pattern => pattern.test(combinedText));
        if (match) {
            const found = combinedText.match(match);
            details.netQuantity = found && found[1] && found[2] ? `${found[1]} ${found[2]}` : 'Found';
        }
    }

    // 3. MRP (Inclusive of Taxes) Check
    const mrpPatterns = [
        /m\.?r\.?p\.?[:\s]*₹?(\d+(?:\.\d+)?)/i,
        /maximum retail price[:\s]*₹?(\d+(?:\.\d+)?)/i,
        /inclusive of all taxes/i,
        /incl\.?\s+of\s+all\s+taxes/i,
        /price inclusive of taxes/i,
        /incl\.?\s+taxes/i,
        /tax inclusive/i
    ];
    
    results.mrp = mrpPatterns.some(pattern => pattern.test(combinedText)) || 
                  (scrapedData.mrp && scrapedData.mrp.length > 0);
    if (results.mrp) {
        score++;
        if (scrapedData.mrp) {
            details.mrp = scrapedData.mrp;
        }
    }

    // 4. Consumer Care Details Check
    const consumerCarePatterns = [
        /consumer care[:\s]*([^,\n]+)/i,
        /customer (?:care|support|service)[:\s]*([^,\n]+)/i,
        /contact[:\s]*(?:us[:\s]*)?([^,\n]*(?:@[^\s,]+|[\d\s-]{10,}))/i,
        /email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /phone[:\s]*([\d\s\-+()]{10,})/i,
        /helpline[:\s]*([\d\s\-+()]{10,})/i,
        /toll[:\s]*free[:\s]*([\d\s\-+()]{10,})/i,
        /support[:\s]*email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ];
    
    results.consumerCare = consumerCarePatterns.some(pattern => pattern.test(combinedText));
    if (results.consumerCare) {
        score++;
        const match = consumerCarePatterns.find(pattern => pattern.test(combinedText));
        if (match) {
            const found = combinedText.match(match);
            details.consumerCare = found && found[1] ? found[1].trim() : 'Found';
        }
    }

    // 5. Country of Origin Check
    const countryPatterns = [
        /country of origin[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;)/i,
        /origin[:\s]*country[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;)/i,
        /made in[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;)/i,
        /manufactured in[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;)/i,
        /imported from[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;)/i,
        /origin[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;)/i
    ];
    
    results.countryOfOrigin = countryPatterns.some(pattern => pattern.test(combinedText));
    if (results.countryOfOrigin) {
        score++;
        const match = countryPatterns.find(pattern => pattern.test(combinedText));
        if (match) {
            const found = combinedText.match(match);
            details.countryOfOrigin = found ? found[1].trim() : 'Found';
        }
    }

    // 6. FSSAI License Number Check (for food products)
    const fssaiPatterns = [
        /fssai\s+(?:license|lic\.?|no\.?|number)[:\s#]*([a-zA-Z0-9]{14})/i,
        /fssai[:\s#]*([a-zA-Z0-9]{14})/i,
        /food safety and standards authority of india[:\s]*([a-zA-Z0-9]{14})/i,
        /lic\.?\s+no\.?[:\s]*([a-zA-Z0-9]{14})/i,
        /license\s+number[:\s]*([a-zA-Z0-9]{14})/i,
        /food\s+license[:\s]*([a-zA-Z0-9]{14})/i
    ];
    
    results.fssaiLicense = fssaiPatterns.some(pattern => pattern.test(combinedText));
    if (results.fssaiLicense) {
        score++;
        const match = fssaiPatterns.find(pattern => pattern.test(combinedText));
        if (match) {
            const found = combinedText.match(match);
            details.fssaiLicense = found ? found[1] : 'Found';
        }
    }

    // 7. Best Before Date Format Check
    const bestBeforeDatePatterns = [
        /best before[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /best before[:\s]*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
        /use by[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /expiry date[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /exp\.?\s+date[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /bb[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /best before[:\s]*(\d{1,2}[\/\-\.]\d{4})/i,
        /(?:best before|use by|expiry)[:\s]*([a-z]{3}\s+\d{4})/i
    ];
    
    results.bestBeforeDate = bestBeforeDatePatterns.some(pattern => pattern.test(combinedText));
    if (results.bestBeforeDate) {
        score++;
        const match = bestBeforeDatePatterns.find(pattern => pattern.test(combinedText));
        if (match) {
            const found = combinedText.match(match);
            details.bestBeforeDate = found ? found[1] : 'Found';
        }
    }

    const complianceScore = (score / totalChecks) * 100;
    
    return {
        complianceScore: `${complianceScore.toFixed(2)}%`,
        scoreDetails: `${score}/${totalChecks} checks passed`,
        checks: results,
        extractedDetails: details,
        recommendations: generateRecommendations(results),
        complianceLevel: getComplianceLevel(complianceScore)
    };
}

function generateRecommendations(results) {
    const recommendations = [];
    
    if (!results.manufacturerDetails) {
        recommendations.push({
            issue: "Missing Manufacturer/Packer Details",
            solution: "Add manufacturer/packer details clearly mentioning 'Manufactured by' or 'Packed by' with complete address"
        });
    }
    
    if (!results.netQuantity) {
        recommendations.push({
            issue: "Missing Net Quantity Declaration",
            solution: "Include net quantity declaration with proper units (g, kg, ml, l, pieces, etc.)"
        });
    }
    
    if (!results.mrp) {
        recommendations.push({
            issue: "Missing MRP Information",
            solution: "Display MRP clearly, preferably with 'Inclusive of all taxes' mention"
        });
    }
    
    if (!results.consumerCare) {
        recommendations.push({
            issue: "Missing Consumer Care Details",
            solution: "Add consumer care details including email, phone number, or helpline"
        });
    }
    
    if (!results.countryOfOrigin) {
        recommendations.push({
            issue: "Missing Country of Origin",
            solution: "Mention 'Country of Origin' or 'Made in [Country]' clearly"
        });
    }
    
    if (!results.bestBeforeDate) {
        recommendations.push({
            issue: "Missing Best Before Date",
            solution: "Add 'Best Before' date in DD/MM/YYYY or DD MMM YYYY format"
        });
    }
    
    return recommendations;
}

function getComplianceLevel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 25) return 'Poor';
    return 'Critical';
}

// Additional utility function to check specific compliance requirements
function checkSpecificCompliance(scrapedData, ocrText, requirements) {
    const result = checkCompliance(scrapedData, ocrText);
    const filteredResults = {};
    const filteredDetails = {};
    let filteredScore = 0;
    
    requirements.forEach(req => {
        if (result.checks[req] !== undefined) {
            filteredResults[req] = result.checks[req];
            if (result.extractedDetails[req]) {
                filteredDetails[req] = result.extractedDetails[req];
            }
            if (result.checks[req]) filteredScore++;
        }
    });
    
    const filteredComplianceScore = (filteredScore / requirements.length) * 100;
    
    return {
        complianceScore: `${filteredComplianceScore.toFixed(2)}%`,
        scoreDetails: `${filteredScore}/${requirements.length} checks passed`,
        checks: filteredResults,
        extractedDetails: filteredDetails,
        complianceLevel: getComplianceLevel(filteredComplianceScore)
    };
}

module.exports = { 
    checkCompliance,
    generateRecommendations,
    getComplianceLevel,
    checkSpecificCompliance
};