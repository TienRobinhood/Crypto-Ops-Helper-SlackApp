import { config } from 'dotenv';
import pkg from '@slack/bolt';
import axios from 'axios';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { copyAndModifySheet } from './Google/CashLiquidityGsheet.js'; // Import the correct function
import { copyAndModifySheetTwoDays } from './Google/CashLiquidityGsheet.js';

const { App } = pkg;

config({ path: '../.env' });

const TARGET_CHANNEL_ID = 'C03B8CE5XK6';

const app = new App({
    token: process.env.BOT_TOKEN,
    appToken: process.env.APP_TOKEN,
    signingSecret: process.env.SIGNING_SECRET,
    socketMode: true,
});

async function scanChannelForPDF() {
    try {
        let hasMore = true;
        let cursor;

        while (hasMore) {
            const result = await app.client.conversations.history({
                token: process.env.BOT_TOKEN,
                channel: TARGET_CHANNEL_ID,
                limit: 100,
                cursor: cursor,
            });

            const messages = result.messages;
            console.log(`Fetched ${messages.length} messages from the channel.`);

            for (let message of messages) {
                if (message.files && message.files.length > 0) {
                    for (let file of message.files) {
                        console.log(`Checking file: ${file.name} with mimetype: ${file.mimetype}`);
                        if (file.mimetype === 'application/pdf') {
                            console.log('PDF file detected in channel:', file.name);
                            return file; // Return the file object to be processed
                        } else {
                            console.log('File is not a PDF:', file.mimetype);
                        }
                    }
                } else {
                    console.log('No files attached to this message.');
                }
            }

            hasMore = result.has_more;
            cursor = result.response_metadata?.next_cursor;
        }

        console.log('No PDF files found in the channel.');
        return null; // Return null if no PDF found
    } catch (error) {
        console.error('Error fetching messages:', error);
        throw new Error('Failed to scan the Slack channel.');
    }
}

// Function to scan the Slack channel for a PDF file (for two days)
async function scanChannelForPDFTwoDays() {
    try {
        let hasMore = true;
        let cursor;

        while (hasMore) {
            const result = await app.client.conversations.history({
                token: process.env.BOT_TOKEN,
                channel: TARGET_CHANNEL_ID,
                limit: 100,
                cursor: cursor,
            });

            const messages = result.messages;
            console.log(`Fetched ${messages.length} messages from the channel.`);

            for (let message of messages) {
                if (message.files && message.files.length > 0) {
                    for (let file of message.files) {
                        console.log(`Checking file: ${file.name} with mimetype: ${file.mimetype}`);
                        if (file.mimetype === 'application/pdf') {
                            console.log('PDF file detected in channel:', file.name);
                            return file; // Return the file object to be processed
                        } else {
                            console.log('File is not a PDF:', file.mimetype);
                        }
                    }
                } else {
                    console.log('No files attached to this message.');
                }
            }

            hasMore = result.has_more;
            cursor = result.response_metadata?.next_cursor;
        }

        console.log('No PDF files found in the channel.');
        return null; // Return null if no PDF found
    } catch (error) {
        console.error('Error fetching messages:', error);
        throw new Error('Failed to scan the Slack channel.');
    }
}



// Function to process the PDF file and create one Google Sheet
async function processPDFBuffer(fileUrl, fileName, respond) {
    try {
        console.log(`Attempting to fetch file from URL: ${fileUrl}`);

        const response = await axios.get(fileUrl, {
            headers: { 'Authorization': `Bearer ${process.env.BOT_TOKEN}` },
            responseType: 'arraybuffer',
        });

        if (!response || response.status !== 200) {
            throw new Error('Failed to fetch the PDF file.');
        }

        const dataBuffer = Buffer.from(response.data);
        console.log(`Downloaded file size: ${dataBuffer.byteLength} bytes`);

        const header = dataBuffer.slice(0, 5).toString();
        console.log(`File header: ${header}`);

        if (header !== '%PDF-') {
            throw new Error('The file does not appear to be a valid PDF.');
        }

        const data = await pdfParse(dataBuffer);

        const stressTestingIndex = data.text.indexOf("Stress Testing Crypto Net Buy");
        if (stressTestingIndex === -1) {
            throw new Error('Stress Testing Crypto Net Buy section not found in the PDF.');
        }

        const relevantText = data.text.slice(stressTestingIndex);
        console.log('Extracted relevant text:');
        console.log(relevantText);

        const lines = relevantText.split('\n').filter(line => line.trim() !== '');

        const date = new Date();
        const formattedDate = `${date.getMonth() + 1}.${date.getDate()}.${date.getFullYear()}`;

        const newSheetName = `${formattedDate} - 1 day`;

        try {
            // Attempt to create the sheet
            await copyAndModifySheet(newSheetName, lines);

            // Inform the user if the sheet was created successfully
            await respond({
                response_type: 'ephemeral',
                text: `Stress test data has been updated in the Google Sheet "${newSheetName}".`
            });
        } catch (error) {
            // Handle the specific case where the sheet already exists
            if (error.message.includes('already exists')) {
                console.log(`The sheet "${newSheetName}" already exists.`);
                await respond({
                    response_type: 'ephemeral',
                    text: `The sheet "${newSheetName}" already exists. No new sheet was created.`
                });
            } else {
                throw error; // Re-throw other errors
            }
        }

    } catch (error) {
        console.error('Error processing PDF:', error);
        throw error; // Re-throw the error to be handled by the caller
    }
}


// Function to process the PDF file and create two Google Sheets
async function processPDFBufferTwoDays(fileUrl, fileName, respond) {
    try {
        console.log(`Attempting to fetch file from URL: ${fileUrl}`);

        const response = await axios.get(fileUrl, {
            headers: { 'Authorization': `Bearer ${process.env.BOT_TOKEN}` },
            responseType: 'arraybuffer',
        });

        if (!response || response.status !== 200) {
            throw new Error('Failed to fetch the PDF file.');
        }

        const dataBuffer = Buffer.from(response.data);
        console.log(`Downloaded file size: ${dataBuffer.byteLength} bytes`);

        const header = dataBuffer.slice(0, 5).toString();
        console.log(`File header: ${header}`);

        if (header !== '%PDF-') {
            throw new Error('The file does not appear to be a valid PDF.');
        }

        const data = await pdfParse(dataBuffer);

        const stressTestingIndex = data.text.indexOf("Stress Testing Crypto Net Buy");
        if (stressTestingIndex === -1) {
            throw new Error('Stress Testing Crypto Net Buy section not found in the PDF.');
        }

        const relevantText = data.text.slice(stressTestingIndex);
        console.log('Extracted relevant text:');
        console.log(relevantText);

        const lines = relevantText.split('\n').filter(line => line.trim() !== '');

        const date = new Date();
        const formattedDate = `${date.getMonth() + 1}.${date.getDate()}.${date.getFullYear()}`;

        const newSheetName1 = `${formattedDate} - 1 day`;
        const newSheetName2 = `${formattedDate} - 2 day`;

        let firstSheetCreated = false;
        let secondSheetCreated = false;

        // Try to create the first sheet
        try {
            console.log(`Creating first sheet: ${newSheetName1}`);
            await copyAndModifySheetTwoDays(newSheetName1, lines);
            firstSheetCreated = true;
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log(`The sheet "${newSheetName1}" already exists. No new sheet was created`);
            } else {
                throw error; // Re-throw if it's a different error
            }
        }

        // Try to create the second sheet
        try {
            console.log(`Creating second sheet: ${newSheetName2}`);
            await copyAndModifySheetTwoDays(newSheetName2, lines);
            secondSheetCreated = true;
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log(`The sheet "${newSheetName2}" already exists. No new sheet was created`);
            } else {
                throw error; // Re-throw if it's a different error
            }
        }

        // Respond with appropriate message based on what was created
        if (firstSheetCreated && secondSheetCreated) {
            await respond({
                response_type: 'ephemeral',
                text: `Stress test data has been updated in both Google Sheets: "${newSheetName1}" and "${newSheetName2}".`
            });
        } else if (firstSheetCreated) {
            await respond({
                response_type: 'ephemeral',
                text: `Stress test data has been updated in "${newSheetName1}". The sheet "${newSheetName2}" already exists.`
            });
        } else if (secondSheetCreated) {
            await respond({
                response_type: 'ephemeral',
                text: `The sheet "${newSheetName1}" already exists. Stress test data has been updated in "${newSheetName2}".`
            });
        } else {
            await respond({
                response_type: 'ephemeral',
                text: `Both sheets "${newSheetName1}" and "${newSheetName2}" already exist. No new sheet was created`
            });
        }

    } catch (error) {
        console.error('Error processing PDF:', error);
        throw error; // Re-throw the error to be handled by the caller
    }
}




// Command listener for /update_stress_test_data
app.command('/update_stress_test_data', async ({ command, ack, respond }) => {
    ack(); // Acknowledge the command request

    try {
        await respond({
            response_type: 'ephemeral',
            text: 'Stress test command for 1 day is running...'
        });

        const pdfFile = await scanChannelForPDF();
        if (pdfFile) {
            await processPDFBuffer(pdfFile.url_private, pdfFile.name, respond);

        } else {
            await respond({
                response_type: 'ephemeral',
                text: 'No PDF file found! Check if the command has been run for today already.',
            });
        }
    } catch (error) {
        console.error('Error during the command execution:', error);
        await respond({
            response_type: 'ephemeral',
            text: `Error occurred: ${error.message}`
        });
    }
});








// Command listener for /update_stress_test_data_2_days
app.command('/update_stress_test_data_2_days', async ({ command, ack, respond }) => {
    ack(); // Acknowledge the command request

    try {
        await respond({
            response_type: 'ephemeral',
            text: 'Stress test command for 2 days is running...'
        });

        const pdfFile = await scanChannelForPDFTwoDays();
        if (pdfFile) {
            await processPDFBufferTwoDays(pdfFile.url_private, pdfFile.name, respond);
        } else {
            await respond({
                response_type: 'ephemeral',
                text: 'No PDF file found! Check if the command has been ran for today already.',
            });
        }
    } catch (error) {
        console.error('Error during the command execution:', error);
        await respond({
            response_type: 'ephemeral',
            text: `Error occurred: ${error.message}`
        });
    }
});




// Start the Slack app
app.start().then(() => {
    console.log("Bolt app is running and waiting for /update_stress_test_data and /update_stress_test_data_two_days commands!");
}).catch(error => {
    console.error('Failed to start the Bolt app:', error);
});