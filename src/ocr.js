// src/ocr.js
const Tesseract = require('tesseract.js');

async function getTextFromImage(imageUrl) {
    try {
        console.log(`Performing OCR on image: ${imageUrl}`);
        const { data: { text } } = await Tesseract.recognize(
            imageUrl,
            'eng' // Language: English
        );
        console.log("OCR process completed successfully.");
        return text;
    } catch (error) {
        console.error(`Error during OCR on ${imageUrl}:`, error.message);
        throw new Error('Failed to extract text from an image.');
    }
}

module.exports = { getTextFromImage };