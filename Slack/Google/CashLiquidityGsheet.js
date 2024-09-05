// Import the Google APIs client library for Node.js
import { google } from 'googleapis';
// Import the dotenv library to load environment variables from a .env file
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

// Define the scope for accessing Google Sheets
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// Specify the ID of the Google Spreadsheet you want to interact with
const SPREADSHEET_ID = "1lt4f0OB5sqE5aVLEM0gSsgf5Iy3tx2t5xVuxZRP-a6o"; // Replace with your actual spreadsheet ID

// Initialize GoogleAuth to authenticate using a service account
const auth = new google.auth.GoogleAuth({
    keyFile: 'Google/credentials.json', // Path to your service account JSON file
    scopes: SCOPES, // Scopes define the API access level
});

// Create a Sheets API client using the authenticated credentials
const sheets = google.sheets({ version: 'v4', auth });

// Function to get the ID of the first sheet in the spreadsheet
async function getFirstSheetId() {
    // Fetch the spreadsheet's metadata, including sheet information
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });

    // Extract the first sheet from the metadata
    const firstSheet = spreadsheet.data.sheets[0];
    // If no sheets are found, throw an error
    if (!firstSheet) throw new Error('No sheets found in the spreadsheet');

    // Return the ID of the first sheet
    return firstSheet.properties.sheetId;
}

// Main function to copy the first sheet, modify it, and insert data
export async function copyAndModifySheet(newSheetName, lines) {
    try {
        // Step 1: Check if a sheet with the newSheetName already exists
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
            fields: 'sheets.properties.title,sheets.properties.sheetId',
        });

        const existingSheet = spreadsheet.data.sheets.find(
            sheet => sheet.properties.title === newSheetName
        );

        if (existingSheet) {
            const customErrorMessage = `The sheet "${newSheetName}" already exists.`;
            console.error(customErrorMessage);
            throw new Error(customErrorMessage);
        }

        // Step 2: Get the first sheet ID
        const firstSheetId = await getFirstSheetId();

        // Step 3: Create a copy of the first sheet within the same spreadsheet
        const copyResponse = await sheets.spreadsheets.sheets.copyTo({
            spreadsheetId: SPREADSHEET_ID,
            sheetId: firstSheetId, // ID of the first sheet to copy
            requestBody: {
                destinationSpreadsheetId: SPREADSHEET_ID // Copy within the same spreadsheet
            }
        });

        // Extract the ID of the new sheet that was created
        const newSheetId = copyResponse.data.sheetId;
        console.log(`New sheet created with ID: ${newSheetId}`);

        // Step 4: Rename the new sheet and move it to the first position
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: newSheetId,
                                title: newSheetName, // New name for the sheet
                                index: 0 // Move the new sheet to the first position (leftmost)
                            },
                            fields: 'title,index'
                        }
                    }
                ]
            }
        });
        console.log(`Sheet renamed and moved to the first position: ${newSheetName}`);

        // Step 5: Parse and format the lines to extract specific values from the data
        const extractedData = extractData(lines);

        // Step 6: Define the mapping of extracted values to specific cells in the new sheet
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

        // Step 7: Create the update requests for each cell based on the extracted data
        const requests = cellMapping.map(({ value, row, col }) => {
            // Ensure the value is defined and handle different types of values (strings vs numbers)
            if (value !== undefined) {
                // If the value contains 'M', remove it and treat it as millions
                const parsedValue = parseFloat(value.replace(/M/g, '').trim());
                const userEnteredValue = isNaN(parsedValue)
                    ? { stringValue: value } // Insert as string if not a number
                    : { numberValue: parsedValue * 1000000 }; // Insert as number if it is numeric

                // Return an update request for the cell
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
                // Log an error if the value is undefined for the specified cell
                console.error(`Undefined value found for row ${row + 1}, col ${col + 1}`);
                return null;
            }
        }).filter(request => request !== null); // Filter out any null requests

        // Step 8: Execute the batch update to insert the data into the new sheet 
        let response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: { requests }
        });

        console.log('PDF data inserted successfully into the new sheet:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error processing the sheet:', error);
        throw error; // Re-throw to let the calling function handle it
    }
}


// Helper function to extract and format the necessary data from the input lines
function extractData(lines) {
    return lines.map(line => line.split(/\s+/).map(value => value.trim()));
}
