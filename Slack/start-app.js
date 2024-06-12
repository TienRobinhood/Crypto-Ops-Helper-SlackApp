import { config } from 'dotenv'; // Import dotenv to manage environment variables from a .env file
import pkg from '@slack/bolt'; // Import the Slack Bolt package for creating Slack apps
import { insertTransactions } from './Google/Gsheet.js'; // Import the insertTransactions function from the Google/Gsheet module

const { App } = pkg; // Destructure App from the imported pkg

// Load environment variables from the .env file located in the parent directory
config({ path: '../.env' });

// Define constants for Slack channel ID and bot ID
const MONEY_MOVEMENT_CHANNEL = 'C92T0N3DM'; // Channel ID for money movement
const CRYPTO_BOT_ID = 'B02CV4E2Z9Q'; // ID for the crypto bot

// Define a mapping of Slack user IDs to names for easy reference
const SETTLEMENTS_USERS = {
    'U020LSUKYJF': 'Albi Mema',
    'U03C90VTLUX': 'Andy Bhatia',
    'U0103CQHUG0': 'Charles Peterson',
    'U04QA2HDVCJ': 'Yueken Jiao',
    'U075FJJMTMZ': 'Tien Nguyen',
    'U011SEVFY05': 'Tanner Freeman'
};

// Initialize the Slack app with necessary tokens and settings for socket mode
const app = new App({
    token: process.env.BOT_TOKEN, // Bot token for authentication
    appToken: process.env.APP_TOKEN, // App-level token for socket mode
    signingSecret: process.env.SIGNING_SECRET, // Signing secret to verify request signatures
    socketMode: true // Enable socket mode for real-time communication
});

/**
 * Fetch messages from the specified Slack channel.
 * @returns {Object} The EOD message if found, otherwise undefined.
 */
async function getMessages() {
    // Fetch message history from the specified channel
    let data = await app.client.conversations.history({
        token: process.env.BOT_TOKEN, // Bot token for authentication
        channel: MONEY_MOVEMENT_CHANNEL, // Channel ID to fetch messages from
        limit: 500 // Increase the limit to fetch more messages
    });

    let messages = data.messages; // Extract messages from the response data
    console.log(`Fetched ${messages.length} messages from the channel.`); // Log the number of messages fetched
    let eod_message = undefined; // Initialize a variable to store the EOD message

    // Loop through the messages to find the relevant EOD message
    for (let message of messages) {
        // Check if the message is from the crypto bot and has the 'Settlement Status' attachment
        if (message.bot_profile && message.bot_profile.id === CRYPTO_BOT_ID) {
            if (message.attachments && message.attachments[0].author_name === 'Settlement Status') {
                // Check if the custodian field is 'rht'
                const custodianField = message.attachments[0].fields.find(field => field.title === 'Custodian');
                if (custodianField && custodianField.value === 'rht') {
                    eod_message = message; // Assign the message to eod_message if conditions are met
                    break; // Exit the loop once the correct message is found
                }
            }
        }
    }
    return eod_message; // Return the found EOD message
}

/**
 * Process the EOD message and insert transactions into Google Sheets.
 * @param {Array} fields - The fields of the EOD message.
 */
async function processEODMessage(fields) {
    // Aggregate transactions by title
    const transactionsMap = new Map();

    // Filter out 'Custodian' and 'Approvers' fields and process each field
    fields
        .filter(field => field.title !== 'Custodian' && field.title !== 'Approvers')
        .forEach(field => {
            const amountMatch = field.title.match(/([\d,.]+)/); // Extract the amount from the field title using regex
            const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : null; // Convert the amount to a float

            // Split field value by commas to handle multiple transactions in a single field
            const urlStatusPairs = field.value.split(/,(?=<)/).map(item => item.match(/<(.+?)\|(blockchain_confirmed|blockchain_observed)>/)).filter(Boolean);

            // If the transaction title is not already in the map, add it
            if (!transactionsMap.has(field.title)) {
                transactionsMap.set(field.title, { title: field.title, amount, urls: [], statuses: [] });
            }

            const transaction = transactionsMap.get(field.title); // Get the transaction object from the map

            // Iterate over all matched URL-status pairs
            urlStatusPairs.forEach(match => {
                const url = match[1]; // Extract URL from match
                const status = match[2]; // Extract status from match
                transaction.urls.push(url); // Add URL to transaction
                transaction.statuses.push(status); // Add status to transaction
            });
        });

    const transactions = Array.from(transactionsMap.values()); // Convert the map values to an array

    // Debug statement to print all transactions
    console.log('Transactions:', JSON.stringify(transactions, null, 2));

    const approversField = fields.find(field => field.title === 'Approvers'); // Find the approvers field
    const custodianField = fields.find(field => field.title === 'Custodian'); // Find the custodian field

    // Convert user IDs in the approvers field to names
    const userLinksString = approversField.value.replace(/<@(U\w+)>/g, (match, userId) => {
        return SETTLEMENTS_USERS[userId] ? `@${SETTLEMENTS_USERS[userId]}` : match;
    });

    // Debugging line for userLinksString
    console.log('Generated userLinksString:', userLinksString);

    // Send transactions to Google Sheets
    await insertTransactions(transactions, userLinksString, custodianField.value, 'Custodian');
}

/**
 * Convert user IDs to user names in fields.
 * @param {Array} fields - The fields of the EOD message.
 * @returns {Array} The fields with user IDs converted to user names.
 */
function convertUserIDsToNames(fields) {
    return fields.map(field => {
        return {
            ...field, // Spread the original field properties
            // Replace user IDs with user names in the field value
            value: field.value.replace(/<@(U\w+)>/g, (match, userId) => {
                return SETTLEMENTS_USERS[userId] ? SETTLEMENTS_USERS[userId] : match;
            })
        };
    });
}


// /**
//  * Convert user IDs to user names with hyperlinks in fields.
//  * @param {Array} fields - The fields of the EOD message.
//  * @returns {Array} The fields with user IDs converted to user names with hyperlinks.
//  */
// function convertUserIDsToNames(fields) {
//     return fields.map(field => {
//         return {
//             ...field, // Spread the original field properties
//             // Replace user IDs with hyperlinks to user profiles in the field value
//             value: field.value.replace(/<@(U\w+)>/g, (match, userId) => {
//                 const userName = SETTLEMENTS_USERS[userId];
//                 return userName ? `=HYPERLINK("https://slack.com/app_redirect?channel=${userId}", "@${userName}")` : match;
//             })
//         };
//     });
// } DOESN'T WORK FOR SAME REASON AS HAVING MULTIPLE HYPERLINKS IN ONE


// Command handler for the /update_eod_settlements Slack command
app.command('/update_eod_settlements', async ({ command, ack, respond }) => {
    ack(); // Acknowledge the command request

    // Check if the user has permission to use the command
    if (!SETTLEMENTS_USERS.hasOwnProperty(command.user_id)) {
        await respond({
            response_type: 'ephemeral', // Send an ephemeral response (visible only to the user)
            text: 'You do not have permission to use this command.' // Inform the user they do not have permission
        });
        return;
    }

    try {
        let eodMessage = await getMessages(); // Fetch messages from the channel
        if (eodMessage) {
            const attachment = eodMessage.attachments[0]; // Get the attachment from the EOD message
            console.log('Found EOD message:');
            console.log('Author:', attachment.author_name); // Log the author of the message
            console.log('Fields:', attachment.fields); // Log the fields of the message

            await respond({
                response_type: 'ephemeral',
                text: `Found EOD message.`
            });

            // Convert user IDs to names in the fields
            const updatedFields = convertUserIDsToNames(attachment.fields);

            // Process the fields and send data to Google Sheets
            await processEODMessage(updatedFields);

            await respond({
                response_type: 'ephemeral',
                text: 'Google Sheet has been updated with the EOD data.'
            });

        } else {
            await respond({
                response_type: 'ephemeral',
                text: 'No EOD message found.'
            });
        }
    } catch (error) {
        console.error('Error fetching messages:', error); // Log the error if fetching messages fails
        await respond({
            response_type: 'ephemeral',
            text: `Error occurred: ${error.message}` // Inform the user of the error
        });
    }
});

// Start the Slack app and log a message indicating it is running
app.start().then(() => console.log("Bolt app is running!"));
