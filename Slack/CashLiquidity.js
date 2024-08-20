import { config } from 'dotenv';
import pkg from '@slack/bolt';
import axios from 'axios';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { insertPDFData } from './Google/CashLiquidityGsheet.js'; // Import the Google Sheets function

const { App } = pkg;

config({ path: '../.env' });

const TARGET_CHANNEL_ID = 'C076CEY7FJ6';

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

            // Insert the extracted data into Google Sheets
            await insertPDFData(lines);

        } else {
            console.log('Stress Testing Crypto Net Buy section not found in the PDF.');
        }

    } catch (error) {
        console.error('Error processing PDF:', error);
    }
}

app.start().then(() => {
    console.log("Bolt app is running!");
    scanChannelForPDF(); // Start scanning the channel for PDF files
}).catch(error => {
    console.error('Failed to start the Bolt app:', error);
});
