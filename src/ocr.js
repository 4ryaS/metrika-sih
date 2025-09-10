// src/ocr.js
const Tesseract = require('tesseract.js');

async function getTextFromImage(imageUrl) {
    try {
        console.log(`Performing OCR on image: ${imageUrl}`);
        const { data: { text } } = await Tesseract.recognize(
            imageUrl,
            'eng' // Language code (English)
        );
        console.log("OCR process completed.");
        return text;
    } catch (error) {
        console.error("Error during OCR processing:", error);
        throw new Error('Failed to extract text from the image.');
    }
}

module.exports = { getTextFromImage };