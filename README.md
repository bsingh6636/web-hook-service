# Webhook Forwarding Service

This service receives webhooks, forwards them to a specified URL, and logs any failed attempts to a database. You can also retrieve the details of these failed requests.

## Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Configure the target URL:**
    Create a `.env` file in the root of the project and add the URL you want to forward webhooks to:
    ```
    TARGET_WEBHOOK_URL=https://your-target-webhook-url.com
    ```

## Usage

### Development

To run the server in development mode (with automatic reloading):

```bash
npm run dev
```

The server will start on port 3000 by default.

### Production

To build and run the server in production:

1.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```

2.  **Start the server:**
    ```bash
    npm start
    ```

## API Endpoints

*   `POST /webhook`: The endpoint to send your webhooks to. It will forward the request to the `TARGET_WEBHOOK_URL`.
*   `GET /missed-requests`: Retrieves a list of all the webhooks that failed to be forwarded.

