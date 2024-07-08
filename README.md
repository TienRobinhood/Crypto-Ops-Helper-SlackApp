# README for Running and Managing the Node.js Slack Application

**Date Created:** `June 12, 2024`

**Team:** `Crypto Settlements`

**Owner:** `Tien Nguyen`

---

## Introduction

This document outlines the steps to run and manage the Node.js Slack application that interacts with Google Sheets to insert transaction data and handle Slack commands.

## Scope and Purpose

The purpose of this README is to ensure that the Node.js Slack application runs smoothly and reliably, integrating Slack commands with Google Sheets for data updates. This README covers the setup, execution, and management of the application.

## Definitions

- **Node.js Application:** A JavaScript runtime built on Chrome's V8 JavaScript engine.
- **Slack Bot Token:** An OAuth token for authenticating Slack bots.
- **Google Sheets API:** An API used to interact with Google Sheets programmatically.
- **Caffeinate:** A macOS command to prevent the system from sleeping.

## Roles & Responsibilities

- **Developer/IT Team:** Responsible for setting up, running, and maintaining the Node.js application.
- **Slack Users:** Utilize the Slack command to trigger updates to the Google Sheets.

## Process Outline

### 1. Setting Up the Environment
- **Developer/IT Team:**
  - Clone the repository and navigate to the directory:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
  - Install the required npm packages:
    ```bash
    npm install
    ```
  - **Create a `.env` file in the root directory with the following content:**
    ```env
    BOT_TOKEN=xoxb-your-slack-bot-token
    APP_TOKEN=xapp-your-slack-app-token
    SIGNING_SECRET=your-slack-signing-secret
    ```
  - **Create a `credentials.json` file in the `Google` folder with your Google API credentials:**
    ```json
    {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "your-private-key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR-PRIVATE-KEY\n-----END PRIVATE KEY-----\n",
      "client_email": "your-client-email@your-project-id.iam.gserviceaccount.com",
      "client_id": "your-client-id",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-client-email%40your-project-id.iam.gserviceaccount.com"
    }
    ```

### 2. Running the Application
- **Developer/IT Team:**
  - Use `caffeinate` to keep the system awake and run the Node.js application:
    ```bash
    caffeinate -i node start-app.js
    ```

### 3. Handling Slack Commands and Google Sheets Integration
- **Developer/IT Team:**
  - Ensure the application code includes error handling and corrects `@` symbol logic.
  - Key sections of `start-app.js` and `Gsheet.js` should be configured as outlined in the detailed instructions.

### 4. Monitoring the Application (Optional)
- **Developer/IT Team:**
  - Set up a lightweight service to monitor the main application and notify Slack if the application is down.

## Appendix/Links/Associated Documents

- **Google Sheets API Documentation:** [Google Sheets API](https://developers.google.com/sheets/api)
- **Slack API Documentation:** [Slack API](https://api.slack.com/)
- **Node.js Documentation:** [Node.js](https://nodejs.org/)
# Slack-App---Robinhood
# Slack-App---Robinhood
# MM-EOD-Slack-Bot
