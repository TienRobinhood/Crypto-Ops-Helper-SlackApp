import { google } from 'googleapis';
import { format } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const PRODUCTION_SHEET_ID = 0;
const PRODUCTION_SPREADSHEET_ID = "1HveY_6tM0_jPgKg2ECRpkylQ179gjfHWqH1DnGK9hAg";

const SETTLEMENTS_USERS = {
    'U020LSUKYJF': 'Albi Mema',
    'U03C90VTLUX': 'Andy Bhatia',
    'U0103CQHUG0': 'Charles Peterson',
    'U04QA2HDVCJ': 'Yueken Jiao',
    'U075FJJMTMZ': 'Tien Nguyen',
    'U011SEVFY05': 'Tanner Freeman'
};

const auth = new google.auth.GoogleAuth({
    keyFile: 'Google/credentials.json',
    scopes: SCOPES
});

const sheets = google.sheets({ version: 'v4', auth: auth });

async function insertTransactions(transactions, userLinksString, custodianValue, custodianTitle) {
    try {
        const currentDate = format(new Date(), 'MM/dd/yyyy');

        const names = userLinksString.split(',').map(name => name.trim());
        let richTextString = '';
        names.forEach((name, index) => {
            if (!name.startsWith('@')) {
                richTextString += '@';
            }
            richTextString += name;
            if (index < names.length - 1) {
                richTextString += ', ';
            }
        });

        const textFormatRuns = [];
        let currentIndex = 0;
        names.forEach((name, index) => {
            const nameWithAt = (name.startsWith('@') ? name : '@' + name);
            const plainName = name.startsWith('@') ? name.slice(1) : name;
            for (const [userId, userName] of Object.entries(SETTLEMENTS_USERS)) {
                if (plainName === userName) {
                    const url = `https://hood.slack.com/team/${userId}`;
                    const startIndex = currentIndex;

                    textFormatRuns.push({
                        startIndex: startIndex,
                        format: { link: { uri: url } }
                    });
                }
            }
            currentIndex += nameWithAt.length;
            if (index < names.length - 1) {
                currentIndex += 2;
            }
        });

        const insertColumnRequest = {
            insertDimension: {
                range: {
                    sheetId: PRODUCTION_SHEET_ID,
                    dimension: 'COLUMNS',
                    startIndex: 0,
                    endIndex: 1
                },
                inheritFromBefore: false
            }
        };

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
                start: { sheetId: PRODUCTION_SHEET_ID, rowIndex: 0, columnIndex: 0 }
            }
        };

        const userLinksRequest = {
            updateCells: {
                rows: [
                    {
                        values: [
                            {
                                userEnteredValue: { stringValue: richTextString },
                                textFormatRuns: textFormatRuns
                            }
                        ]
                    }
                ],
                fields: '*',
                start: { sheetId: PRODUCTION_SHEET_ID, rowIndex: 1, columnIndex: 0 }
            }
        };

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
                start: { sheetId: PRODUCTION_SHEET_ID, rowIndex: 2, columnIndex: 0 }
            }
        };

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
                start: { sheetId: PRODUCTION_SHEET_ID, rowIndex: 3, columnIndex: 0 }
            }
        };

        let transactionRequests = [];
        if (transactions.length > 0) {
            console.log('Transactions detected. Preparing to insert transactions.');
            transactionRequests = transactions.flatMap((transaction, index) => [
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
                        start: { sheetId: PRODUCTION_SHEET_ID, rowIndex: index * 2 + 4, columnIndex: 0 }
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
                        start: { sheetId: PRODUCTION_SHEET_ID, rowIndex: index * 2 + 5, columnIndex: 0 }
                    }
                } : {
                    updateCells: {
                        rows: [
                            {
                                values: [
                                    { userEnteredValue: { stringValue: "CHECK SLACK CHANNEL" } }
                                ]
                            }
                        ],
                        fields: '*',
                        start: { sheetId: PRODUCTION_SHEET_ID, rowIndex: index * 2 + 5, columnIndex: 0 }
                    }
                }
            ]);
        } else {
            console.log('No transactions found. Adding "Check Slack Channel" message.');
            transactionRequests = [
                {
                    updateCells: {
                        rows: [
                            {
                                values: [
                                    { userEnteredValue: { stringValue: "CHECK SLACK CHANNEL" } }
                                ]
                            }
                        ],
                        fields: '*',
                        start: { sheetId: PRODUCTION_SHEET_ID, rowIndex: 4, columnIndex: 0 }
                    }
                }
            ];
        }

        // Log the requests for verification
        console.log('Prepared requests:', JSON.stringify(transactionRequests, null, 2));

        const copyPropertiesRequest = {
            copyPaste: {
                source: {
                    sheetId: PRODUCTION_SHEET_ID,
                    startRowIndex: 0,
                    endRowIndex: 1000,
                    startColumnIndex: 1,
                    endColumnIndex: 2
                },
                destination: {
                    sheetId: PRODUCTION_SHEET_ID,
                    startRowIndex: 0,
                    endRowIndex: 1000,
                    startColumnIndex: 0,
                    endColumnIndex: 1
                },
                pasteType: 'PASTE_FORMAT'
            }
        };

        const requests = [
            insertColumnRequest,
            dateRequest,
            userLinksRequest,
            custodianTitleRequest,
            custodianValueRequest,
            ...transactionRequests,
            copyPropertiesRequest
        ];

        let response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId: PRODUCTION_SPREADSHEET_ID,
            requestBody: { requests }
        });

        console.log('Transactions inserted successfully:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error(`There was an error inserting the transactions!\n${error.stack}`);
        throw new Error(`There was an error inserting the transactions!\n${error.stack}`);
    }
}

export { insertTransactions };
