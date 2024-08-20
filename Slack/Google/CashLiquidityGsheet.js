import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = "1lt4f0OB5sqE5aVLEM0gSsgf5Iy3tx2t5xVuxZRP-a6o"; // Replace with your actual spreadsheet ID

const auth = new google.auth.GoogleAuth({
    keyFile: 'Google/credentials.json', // Path to your service account JSON file
    scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

async function getFirstSheetId() {
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });

    const firstSheet = spreadsheet.data.sheets[0]; // Get the first sheet
    if (!firstSheet) throw new Error('No sheets found in the spreadsheet');

    return firstSheet.properties.sheetId;
}

export async function copyAndModifySheet(newSheetName, lines) {
    try {
        // Step 1: Get the first sheet ID
        const firstSheetId = await getFirstSheetId();

        // Step 2: Create a copy of the first sheet
        const copyResponse = await sheets.spreadsheets.sheets.copyTo({
            spreadsheetId: SPREADSHEET_ID,
            sheetId: firstSheetId, // ID of the first sheet to copy
            requestBody: {
                destinationSpreadsheetId: SPREADSHEET_ID // Copy within the same spreadsheet
            }
        });

        const newSheetId = copyResponse.data.sheetId;
        console.log(`New sheet created with ID: ${newSheetId}`);

        // Step 3: Rename the new sheet
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: newSheetId,
                                title: newSheetName,
                                index: 0 // Move the new sheet to the first position (leftmost)
                            },
                            fields: 'title,index'
                        }
                    }
                ]
            }
        });
        console.log(`Sheet renamed and moved to the first position: ${newSheetName}`);

        // Step 4: Parse and format the lines to extract the specific values
        const extractedData = extractData(lines);

        // Step 5: Define the mapping of values to cells
        const cellMapping = [
            { value: extractedData[2][4], row: 3, col: 13 }, // N4
            { value: extractedData[3][4], row: 4, col: 13 }, // N5
            { value: extractedData[4][4], row: 5, col: 13 }, // N6
            { value: extractedData[2][5], row: 3, col: 14 }, // O4
            { value: extractedData[3][5], row: 4, col: 14 }, // O5
            { value: extractedData[4][5], row: 5, col: 14 }, // O6
            { value: extractedData[2][6], row: 3, col: 15 }, // P4
            { value: extractedData[3][6], row: 4, col: 15 }, // P5
            { value: extractedData[4][6], row: 5, col: 15 }, // P6
            { value: extractedData[2][8], row: 3, col: 16 }, // Q4
            { value: extractedData[3][8], row: 4, col: 16 }, // Q5
            { value: extractedData[4][8], row: 5, col: 16 }, // Q6
            { value: extractedData[2][7], row: 3, col: 17 }, // R4
            { value: extractedData[3][7], row: 4, col: 17 }, // R5
            { value: extractedData[4][7], row: 5, col: 17 }, // R6
        ];

        const requests = cellMapping.map(({ value, row, col }) => {
            // Ensure the value is defined and replace 'M' for numeric values
            if (value !== undefined) {
                const parsedValue = parseFloat(value.replace(/M/g, '').trim());
                const userEnteredValue = isNaN(parsedValue)
                    ? { stringValue: value } // Insert as string if not a number
                    : { numberValue: parsedValue * 1000000 }; // Insert as number if it is numeric

                return {
                    updateCells: {
                        rows: [{
                            values: [{ userEnteredValue }]
                        }],
                        fields: 'userEnteredValue',
                        start: {
                            sheetId: newSheetId,
                            rowIndex: row, // Row index (0-based, so N4 is row 3)
                            columnIndex: col // Column index (N is 13, O is 14, P is 15)
                        }
                    }
                };
            } else {
                console.error(`Undefined value found for row ${row + 1}, col ${col + 1}`);
                return null;
            }
        }).filter(request => request !== null); // Remove any null requests

        let response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: { requests }
        });

        console.log('PDF data inserted successfully into the new sheet:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error processing the sheet:', error);
    }
}

// Helper function to extract and format the necessary data from the PDF text
function extractData(lines) {
    return lines.map(line => line.split(/\s+/).map(value => value.trim()));
}
