// ruleEngine.js

function checkCompliance(scrapedData, ocrText = '') {
    const combinedText = `${scrapedData.title} ${scrapedData.description} ${ocrText}`.toLowerCase();
    
    let score = 0;
    const totalChecks = 6;
    const results = {};
    const details = {};

    // 1. Manufacturer/Packer/Importer Name and Address Check
    const manufacturerPatterns = [
        /manufactured\s+by[:\s]+([^,\n]+)/i,
        /marketed\s+by[:\s]+([^,\n]+)/i,
        /packed\s+by[:\s]+([^,\n]+)/i,
        /packer[:\s]+([^,\n]+)/i,
        /mfd\s*by[:\s]+([^,\n]+)/i,
        /mkt\s*by[:\s]+([^,\n]+)/i,
        /manufacturer[:\s]+([^,\n]+)/i,
        /imported\s+by[:\s]+([^,\n]+)/i,
        /importer[:\s]+([^,\n]+)/i,
        /distributor[:\s]+([^,\n]+)/i,
        /distributed\s+by[:\s]+([^,\n]+)/i
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

    // 2. Net Quantity Declaration Check (with correct units)
    const netQuantityPatterns = [
        /net\s+(?:quantity|wt|weight)[:\s]*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gms|grams|kilograms|millilitres|litres|oz|pounds|lbs|nos|pcs|pieces|units)/i,
        /(?:net\s+)?(?:wt|weight)[:\s]*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gms|grams|kilograms|millilitres|litres|nos|pcs|pieces|units)/i,
        /(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gms|grams|kilograms|millilitres|litres|nos|pcs|pieces|units)\s+(?:net|pack)/i,
        /quantity[:\s]*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|nos|pcs|pieces|units)/i,
        /pack of\s+(\d+)\s*(nos|pcs|pieces|units)?/i,
        /contains[:\s]*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|nos|pcs|pieces|units)/i,
        /(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gms|grams|kilograms|millilitres|litres|nos|pcs|pieces|units)$/i,
        /net\s+content[:\s]*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|nos|pcs|pieces|units)/i
    ];
    
    results.netQuantity = netQuantityPatterns.some(pattern => pattern.test(combinedText));
    if (results.netQuantity) {
        score++;
        const match = netQuantityPatterns.find(pattern => pattern.test(combinedText));
        if (match) {
            const found = combinedText.match(match);
            details.netQuantity = found && found[1] && found[2] ? `${found[1]} ${found[2]}` : 
                                 found && found[1] ? `${found[1]} units` : 'Found';
        }
    }

    // 3. MRP (Inclusive of All Taxes) Check
    const mrpPatterns = [
        /m\.?r\.?p\.?[:\s]*₹?(\d+(?:\.\d+)?)/i,
        /maximum retail price[:\s]*₹?(\d+(?:\.\d+)?)/i,
        /inclusive of all taxes/i,
        /incl\.?\s+of\s+all\s+taxes/i,
        /price inclusive of taxes/i,
        /incl\.?\s+taxes/i,
        /tax inclusive/i,
        /taxes included/i,
        /all taxes included/i
    ];
    
    results.mrp = mrpPatterns.some(pattern => pattern.test(combinedText)) || 
                  (scrapedData.mrp && scrapedData.mrp.length > 0);
    if (results.mrp) {
        score++;
        if (scrapedData.mrp) {
            details.mrp = scrapedData.mrp;
        } else {
            const match = mrpPatterns.find(pattern => pattern.test(combinedText));
            if (match) {
                const found = combinedText.match(match);
                details.mrp = found && found[1] ? `₹${found[1]}` : 'Found';
            }
        }
    }

    // 4. Consumer Care Details Check (phone/email/helpline)
    const consumerCarePatterns = [
        /consumer care[:\s]*([^,\n]+)/i,
        /customer (?:care|support|service)[:\s]*([^,\n]+)/i,
        /contact[:\s]*(?:us[:\s]*)?([^,\n]*(?:@[^\s,]+|[\d\s-]{10,}))/i,
        /email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /phone[:\s]*([\d\s\-+()]{10,})/i,
        /helpline[:\s]*([\d\s\-+()]{10,})/i,
        /toll[:\s]*free[:\s]*([\d\s\-+()]{10,})/i,
        /support[:\s]*email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        /contact[:\s]*number[:\s]*([\d\s\-+()]{10,})/i,
        /call[:\s]*([\d\s\-+()]{10,})/i,
        /(\+?\d{1,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4})/i
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

    // 5. Date of Manufacture/Import or Best Before/Use By Date Check
    const datePatterns = [
        // Best before dates
        /best before[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /best before[:\s]*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
        /bb[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        
        // Use by dates
        /use by[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /use before[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        
        // Expiry dates
        /expiry date[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /exp\.?\s+date[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /expires[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        
        // Manufacturing dates
        /mfg\.?\s+date[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /date of manufacture[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /manufactured on[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /mfd[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        
        // Import dates
        /date of import[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /imported on[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        
        // Month-year formats
        /(?:best before|use by|expiry|mfg|manufactured)[:\s]*([a-z]{3}\s+\d{4})/i,
        /(?:best before|use by|expiry|mfg|manufactured)[:\s]*(\d{1,2}[\/\-\.]\d{4})/i
    ];
    
    results.dateInfo = datePatterns.some(pattern => pattern.test(combinedText));
    if (results.dateInfo) {
        score++;
        const match = datePatterns.find(pattern => pattern.test(combinedText));
        if (match) {
            const found = combinedText.match(match);
            details.dateInfo = found ? found[1] : 'Found';
        }
    }

    // 6. Country of Origin Check ("Made in ___")
    const countryPatterns = [
        /country of origin[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;|\.|!)/i,
        /origin[:\s]*country[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;|\.|!)/i,
        /made in[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;|\.|!)/i,
        /manufactured in[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;|\.|!)/i,
        /imported from[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;|\.|!)/i,
        /origin[:\s]*([a-zA-Z\s]{3,20})(?:\n|,|$|;|\.|!)/i,
        /product of[:\s]*([a-zA-Z\s]+)(?:\n|,|$|;|\.|!)/i
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
            issue: "Missing Manufacturer/Packer/Importer Details",
            solution: "Add manufacturer/packer/importer name and complete address clearly mentioning 'Manufactured by', 'Packed by', or 'Imported by'"
        });
    }
    
    if (!results.netQuantity) {
        recommendations.push({
            issue: "Missing Net Quantity Declaration",
            solution: "Include net quantity with proper units (g, kg, ml, L, nos, pcs, pieces, units, etc.)"
        });
    }
    
    if (!results.mrp) {
        recommendations.push({
            issue: "Missing MRP Information",
            solution: "Display MRP clearly with 'Inclusive of all taxes' mention"
        });
    }
    
    if (!results.consumerCare) {
        recommendations.push({
            issue: "Missing Consumer Care Details",
            solution: "Add consumer care details including phone number, email, or helpline"
        });
    }
    
    if (!results.dateInfo) {
        recommendations.push({
            issue: "Missing Date Information",
            solution: "Add date of manufacture/import OR best before/use by date in DD/MM/YYYY or DD MMM YYYY format"
        });
    }
    
    if (!results.countryOfOrigin) {
        recommendations.push({
            issue: "Missing Country of Origin",
            solution: "Mention 'Country of Origin' or 'Made in [Country]' clearly"
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

// Function to get detailed compliance report
function getDetailedComplianceReport(scrapedData, ocrText = '') {
    const result = checkCompliance(scrapedData, ocrText);
    
    const complianceChecks = [
        {
            name: 'Manufacturer/Packer/Importer Details',
            key: 'manufacturerDetails',
            status: result.checks.manufacturerDetails ? 'PASS' : 'FAIL',
            extractedValue: result.extractedDetails.manufacturerDetails || 'Not found',
            importance: 'Mandatory',
            description: 'Name and complete address of manufacturer, packer, or importer'
        },
        {
            name: 'Net Quantity Declaration',
            key: 'netQuantity',
            status: result.checks.netQuantity ? 'PASS' : 'FAIL',
            extractedValue: result.extractedDetails.netQuantity || 'Not found',
            importance: 'Mandatory',
            description: 'Net quantity with correct units (g, kg, ml, L, nos, pcs, etc.)'
        },
        {
            name: 'MRP (Inclusive of Taxes)',
            key: 'mrp',
            status: result.checks.mrp ? 'PASS' : 'FAIL',
            extractedValue: result.extractedDetails.mrp || 'Not found',
            importance: 'Mandatory',
            description: 'Maximum Retail Price including all taxes'
        },
        {
            name: 'Consumer Care Details',
            key: 'consumerCare',
            status: result.checks.consumerCare ? 'PASS' : 'FAIL',
            extractedValue: result.extractedDetails.consumerCare || 'Not found',
            importance: 'Mandatory',
            description: 'Phone number, email, or helpline for customer support'
        },
        {
            name: 'Date Information',
            key: 'dateInfo',
            status: result.checks.dateInfo ? 'PASS' : 'FAIL',
            extractedValue: result.extractedDetails.dateInfo || 'Not found',
            importance: 'Mandatory',
            description: 'Date of manufacture/import OR best before/use by date'
        },
        {
            name: 'Country of Origin',
            key: 'countryOfOrigin',
            status: result.checks.countryOfOrigin ? 'PASS' : 'FAIL',
            extractedValue: result.extractedDetails.countryOfOrigin || 'Not found',
            importance: 'Mandatory',
            description: 'Country where the product is made or imported from'
        }
    ];
    
    return {
        ...result,
        detailedChecks: complianceChecks,
        summary: {
            totalChecks: complianceChecks.length,
            passedChecks: complianceChecks.filter(check => check.status === 'PASS').length,
            failedChecks: complianceChecks.filter(check => check.status === 'FAIL').length
        }
    };
}

module.exports = { 
    checkCompliance,
    generateRecommendations,
    getComplianceLevel,
    checkSpecificCompliance,
    getDetailedComplianceReport
};