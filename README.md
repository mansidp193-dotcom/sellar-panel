# NexaSeller Merchant Hub

Responsive seller portal prototype built with React, Vite, Node.js and Express.

## Run locally

Use Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`). The Express API runs at `http://localhost:4000`; Vite forwards `/api` requests to it.

## Production build

```bash
npm run build
npm start
```

Express serves the built React app and API on port 4000. Set `PORT` to change the server port.

## API routes

- `POST /api/auth/register` — create a seller account and session
- `POST /api/auth/login` — sign in with a saved seller account
- `POST /api/auth/logout` — end the seller session
- `GET /api/auth/me` — check the current seller session
- `GET /api/health` — server status
- `GET /api/dashboard` — sample seller dashboard data
- `GET /api/orders` — orders and status counts; accepts `q`, `status`, and `field`
- `POST /api/orders/:id/action` — accept or cancel a pending order
- `POST /api/orders/bulk-action` — accept or cancel selected pending orders
- `GET /api/payments` — sample upcoming and completed payment summaries; accepts `q` and `period`
- `GET /api/products` — product list; accepts `q`, `category`, and `status` query parameters
- `POST /api/products` — add a product
- `GET /api/returns` — sample customer return and RTO list; accepts `q`, `status`, and `tab`
- `POST /api/returns/:id/action` — advance a return through approve, pickup, receive, refund, or reject
- `POST /api/actions/:action` — demo seller action

Seller accounts are saved in `server/data/users.json`; passwords are stored as salted scrypt hashes. Login creates an HTTP-only session cookie, and the seller can log out and log in again after the server restarts. Product data is still held in server memory and resets when Express restarts. Registration includes account details, OTP, PAN and identity fields, document selection, bank account and penny-drop confirmation, business classification, pickup location, and a review step. Only the seller name, email, store name, and hashed password are saved. KYC/bank values and selected document names stay in browser memory and are not sent to Express. OTP delivery, document upload, penny-drop verification, and secure persistent KYC storage need service integrations before production use.

Returns are a UI/API prototype seeded with sample orders in server memory. Approving, rejecting, receiving, and refunding update those sample records until Express restarts; connect real marketplace and courier services for live return events.
