import { config } from 'dotenv';
import pkg from '@slack/bolt';
import axios from 'axios';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { copyAndModifySheet } from './Google/CashLiquidityGsheet.js'; // Import the correct function

const { App } = pkg;

config({ path: '../.env' });

const TARGET_CHANNEL_ID = 'C03B8CE5XK6';

const app = new App({
    token: process.env.BOT_TOKEN,
    appToken: process.env.APP_TOKEN,
    signingSecret: process.env.SIGNING_SECRET,
    socketMode: true,
});

// Function to scan the channel for a PDF file
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
                        console.log('Checking file:', file.name);
                        if (file.mimetype === 'application/pdf') {
                            console.log('PDF file detected in channel:', file.name);
                            await processPDFBuffer(file.url_private, file.name);
                            return; // Exit once the first PDF is found and processed
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
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}

// Function to process the PDF file and create one Google Sheet
async function processPDFBuffer(fileUrl, fileName) {
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

        // Extract the text after "Stress Testing Crypto Net Buy"
        const stressTestingIndex = data.text.indexOf("Stress Testing Crypto Net Buy");
        if (stressTestingIndex !== -1) {
            const relevantText = data.text.slice(stressTestingIndex);
            console.log('Extracted relevant text:');
            console.log(relevantText);

            // Break down the relevantText into manageable parts
            const lines = relevantText.split('\n').filter(line => line.trim() !== '');

            // Custom date formatting to MM.DD.YYYY
            const date = new Date();
            const formattedDate = `${date.getMonth() + 1}.${date.getDate()}.${date.getFullYear()}`;

            // Define the new sheet name, e.g., based on the current date
            const newSheetName = `${formattedDate} - 1 day`;

            // Create a copy of the latest sheet, rename it, and populate it with the extracted data
            await copyAndModifySheet(newSheetName, lines);

        } else {
            console.log('Stress Testing Crypto Net Buy section not found in the PDF.');
        }

    } catch (error) {
        console.error('Error processing PDF:', error);
    }
}

async function processPDFBufferTwoDays(fileUrl, fileName) {
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

        // Extract the text after "Stress Testing Crypto Net Buy"
        const stressTestingIndex = data.text.indexOf("Stress Testing Crypto Net Buy");
        if (stressTestingIndex !== -1) {
            const relevantText = data.text.slice(stressTestingIndex);
            console.log('Extracted relevant text:');
            console.log(relevantText);

            // Break down the relevantText into manageable parts
            const lines = relevantText.split('\n').filter(line => line.trim() !== '');

            // Custom date formatting to MM.DD.YYYY
            const date = new Date();
            const formattedDate = `${date.getMonth() + 1}.${date.getDate()}.${date.getFullYear()}`;

            // Define the new sheet names
            const newSheetName1 = `${formattedDate} - 1 day`;
            const newSheetName2 = `${formattedDate} - 2 day`;

            // Create the first sheet
            console.log(`Creating first sheet: ${newSheetName1}`);
            await copyAndModifySheet(newSheetName1, lines);

            // Create the second sheet
            console.log(`Creating second sheet: ${newSheetName2}`);
            await copyAndModifySheet(newSheetName2, lines);

        } else {
            console.log('Stress Testing Crypto Net Buy section not found in the PDF.');
        }

    } catch (error) {
        console.error('Error processing PDF:', error);
    }
}


// Add a command listener for /update_stress_test_data (single sheet)
app.command('/update_stress_test_data', async ({ command, ack, respond }) => {
    ack(); // Acknowledge the command request

    try {
        // Run the logic to scan the channel for PDFs and update the Google Sheet
        await scanChannelForPDF();

        // Respond back to the Slack channel that the operation was successful
        await respond({
            response_type: 'ephemeral',
            text: 'Stress test data has been updated in the Google Sheet.'
        });

    } catch (error) {
        console.error('Error during the command execution:', error);
        await respond({
            response_type: 'ephemeral',
            text: `Error occurred: ${error.message}`
        });
    }
});

// Add a command listener for /update_stress_test_data_2_days (two sheets)
app.command('/update_stress_test_data_2_days', async ({ command, ack, respond }) => {
    ack(); // Acknowledge the command request

    try {
        // Run the logic to scan the channel for PDFs and update two Google Sheets
        await scanChannelForPDFTwoDays();

        // Respond back to the Slack channel that the operation was successful
        await respond({
            response_type: 'ephemeral',
            text: 'Stress test data has been updated in two Google Sheets.'
        });

    } catch (error) {
        console.error('Error during the command execution:', error);
        await respond({
            response_type: 'ephemeral',
            text: `Error occurred: ${error.message}`
        });
    }
});

// Function to scan the channel for a PDF file and process it for two days
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
                        console.log('Checking file:', file.name);
                        if (file.mimetype === 'application/pdf') {
                            console.log('PDF file detected in channel:', file.name);
                            await processPDFBufferTwoDays(file.url_private, file.name);
                            return; // Exit once the first PDF is found and processed
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
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}


// Start the Slack app
app.start().then(() => {
    console.log("Bolt app is running and waiting for /update_stress_test_data and /update_stress_test_data_two_days commands!");
}).catch(error => {
    console.error('Failed to start the Bolt app:', error);
});
