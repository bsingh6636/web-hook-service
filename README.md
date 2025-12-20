# Webhook Forwarding Service

This service receives webhooks from multiple sources, forwards them to a specified URL for each source, and logs any failed attempts to a MongoDB database. You can also retrieve the details of these failed requests.

## Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file in the root of the project. You will need a MongoDB connection string and target URLs for each webhook source. You can get a free MongoDB database from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

    ```
    MONGODB_URI=your-mongodb-connection-string
    TARGET_URL_WHATSAPP=https://your-whatsapp-target-url.com
    TARGET_URL_TELEGRAM=https://your-telegram-target-url.com
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

*   `POST /webhook/:source`: The endpoint to send your webhooks to. Replace `:source` with the name of your webhook source (e.g., `whatsapp`, `telegram`). The service will forward the request to the corresponding `TARGET_URL_*`.

*   `GET /missed-requests`: Retrieves a list of all the webhooks that failed to be forwarded.
    *   **Filter by source:** You can filter the results by source using a query parameter: `GET /missed-requests?source=whatsapp`.