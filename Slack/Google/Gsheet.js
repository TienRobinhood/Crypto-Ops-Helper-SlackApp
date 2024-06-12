import { google } from 'googleapis';
import { format } from 'date-fns';

// Define the required scope for accessing Google Sheets
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Define the ID of the specific sheet within the spreadsheet
const TESTING_SHEET_ID = 110575976;

// Define the ID of the spreadsheet
const TESTING_SPREADSHEET_ID = "1m1dGJ0lsVkpMlw74P7yqfdbG1zvCZ0eBXOmLTah9Hsw";

// Setting up Google Auth
const auth = new google.auth.GoogleAuth({
    keyFile: 'Google/credentials.json', // Path to the service account credentials file
    scopes: SCOPES // Scopes define the level of access requested
});

// Creating a Google Sheets API client
const sheets = google.sheets({ version: 'v4', auth: auth });

/**
 * Inserts transactions into the Google Sheet.
 * @param {Array} transactions - List of transactions to be inserted.
 * @param {String} userLinksString - User links to be inserted.
 * @param {String} custodianValue - Custodian value to be inserted.
 * @param {String} custodianTitle - Custodian title to be inserted.
 */
async function insertTransactions(transactions, userLinksString, custodianValue, custodianTitle) {
    try {
        // Get the current date and format it
        const currentDate = format(new Date(), 'MM/dd/yyyy');

        // Step 1: Insert a new column at the beginning (column A) without formatting
        const insertColumnRequest = {
            insertDimension: {
                range: {
                    sheetId: TESTING_SHEET_ID,
                    dimension: 'COLUMNS',
                    startIndex: 0,
                    endIndex: 1
                },
                inheritFromBefore: false // Do not copy formatting from the previous column
            }
        };

        // Step 2: Prepare the data to be inserted in the new column

        // Insert the current date in the first row, first column
        const dateRequest = {
            updateCells: {
                rows: [
                    {
                        values: [
                            { userEnteredValue: { stringValue: currentDate } }
                        ]
                    }
                ],
                fields: '*',
                start: { sheetId: TESTING_SHEET_ID, rowIndex: 0, columnIndex: 0 }
            }
        };

        // Insert user links in the second row, first column
        const userLinksRequest = {
            updateCells: {
                rows: [
                    {
                        values: [
                            { userEnteredValue: { stringValue: userLinksString } }
                        ]
                    }
                ],
                fields: '*',
                start: { sheetId: TESTING_SHEET_ID, rowIndex: 1, columnIndex: 0 }
            }
        };

        // Insert custodian title in the third row, first column
        const custodianTitleRequest = {
            updateCells: {
                rows: [
                    {
                        values: [
                            { userEnteredValue: { stringValue: custodianTitle } }
                        ]
                    }
                ],
                fields: '*',
                start: { sheetId: TESTING_SHEET_ID, rowIndex: 2, columnIndex: 0 }
            }
        };

        // Insert custodian value in the fourth row, first column
        const custodianValueRequest = {
            updateCells: {
                rows: [
                    {
                        values: [
                            { userEnteredValue: { stringValue: custodianValue } }
                        ]
                    }
                ],
                fields: '*',
                start: { sheetId: TESTING_SHEET_ID, rowIndex: 3, columnIndex: 0 }
            }
        };

        // Prepare the data to insert rich text values for transactions
        const transactionRequests = transactions.flatMap((transaction, index) => [
            {
                updateCells: {
                    rows: [
                        {
                            values: [
                                { userEnteredValue: { stringValue: transaction.title } }
                            ]
                        }
                    ],
                    fields: '*',
                    start: { sheetId: TESTING_SHEET_ID, rowIndex: index * 2 + 4, columnIndex: 0 }
                }
            },
            transaction.urls.length ? {
                updateCells: {
                    rows: [
                        {
                            values: [
                                {
                                    userEnteredValue: { stringValue: transaction.statuses.join(", ") },
                                    textFormatRuns: transaction.urls.map((url, idx) => ({
                                        startIndex: idx > 0 ? transaction.statuses.slice(0, idx).join(", ").length + 2 * idx : 0,
                                        format: { link: { uri: url } }
                                    }))
                                }
                            ]
                        }
                    ],
                    fields: '*',
                    start: { sheetId: TESTING_SHEET_ID, rowIndex: index * 2 + 5, columnIndex: 0 }
                }
            } : null
        ].filter(request => request !== null));

        // Combine all requests
        const requests = [
            insertColumnRequest,
            dateRequest,
            userLinksRequest,
            custodianTitleRequest,
            custodianValueRequest,
            ...transactionRequests
        ];

        // Execute the batchUpdate request with all the transactions
        let response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: TESTING_SPREADSHEET_ID,
            requestBody: { requests }
        });

        // Log the response data on successful insertion
        console.log('Transactions inserted successfully:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        // Log the error with stack trace if insertion fails
        console.error(`There was an error inserting the transactions!\n${error.stack}`);
        throw new Error(`There was an error inserting the transactions!\n${error.stack}`);
    }
}

// Export the insertTransactions function for use in other modules
export { insertTransactions };
