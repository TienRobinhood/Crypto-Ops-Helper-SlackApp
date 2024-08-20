import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = "1lt4f0OB5sqE5aVLEM0gSsgf5Iy3tx2t5xVuxZRP-a6o";
const SHEET_ID = 791972507; // Replace with the correct sheet ID for your sheet

const auth = new google.auth.GoogleAuth({
    keyFile: 'Google/credentials.json', // Path to your service account JSON file
    scopes: SCOPES
});

const sheets = google.sheets({ version: 'v4', auth });

export async function insertPDFData(lines) {
    try {
        // Parse and format the lines to extract the specific values
        const extractedData = extractData(lines);

        // Define the mapping of values to cells
        const cellMapping = [
            { value: extractedData[0][3], row: 3, col: 13 }, // N4
            { value: extractedData[1][3], row: 4, col: 13 }, // N5
            { value: extractedData[2][3], row: 5, col: 13 }, // N6
            { value: extractedData[0][4], row: 3, col: 14 }, // O4
            { value: extractedData[1][4], row: 4, col: 14 }, // O5
            { value: extractedData[2][4], row: 5, col: 14 }, // O6
            { value: extractedData[0][5], row: 3, col: 15 }, // P4
            { value: extractedData[1][5], row: 4, col: 15 }, // P5
            { value: extractedData[2][5], row: 5, col: 15 }, // P6
            { value: extractedData[0][6], row: 3, col: 17 }, // R4
            { value: extractedData[1][6], row: 4, col: 17 }, // R5
            { value: extractedData[2][6], row: 5, col: 17 }, // R6
            { value: extractedData[0][7], row: 3, col: 16 }, // Q4
            { value: extractedData[1][7], row: 4, col: 16 }, // Q5
            { value: extractedData[2][7], row: 5, col: 16 }, // Q6
        ];

        const requests = cellMapping.map(({ value, row, col }) => ({
            updateCells: {
                rows: [{
                    values: [{ userEnteredValue: { numberValue: value } }] // Use numberValue to ensure proper formatting
                }],
                fields: 'userEnteredValue', // Only update the value, preserving the formatting
                start: {
                    sheetId: SHEET_ID,
                    rowIndex: row, // Row index (0-based, so N4 is row 3)
                    columnIndex: col // Column index (N is 13, O is 14, P is 15)
                }
            }
        }));

        let response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: { requests }
        });

        console.log('PDF data inserted successfully:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error inserting PDF data into Google Sheets:', error);
    }
}

// Function to extract and format the necessary data from the PDF text
function extractData(lines) {
    // Parse and convert the M values to numbers
    const extractedValues = lines.slice(2, 5).map(line => {
        return line.split('M').slice(1).map(val => {
            const number = parseFloat(val.trim()) * 1000000;
            return number.toFixed(2); // Ensure two decimal places
        });
    });

    return extractedValues;
}