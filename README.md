A complete end-to-end project: a React dashboard, an Express + SQLite backend,
and a Solidity smart contract deployed on a local Hardhat Ethereum network.
Every reservation, cancellation, violation, and fine payment is written to the
smart contract, and the real transaction hash + confirmation status are shown
in the UI and cross-checked on a verification page.

```
┌────────────┐     REST      ┌────────────┐    ethers.js    ┌──────────────┐
│  React UI  │ ───────────▶  │  Express   │ ─────────────▶ │  Hardhat     │
│  (Vite)    │ ◀───────────  │  + SQLite  │ ◀───────────── │  ParkingRegistry │
└────────────┘   JSON        └────────────┘   tx hash       └──────────────┘
```

## Project layout

```
.
├── blockchain/          Solidity contract + Hardhat config + deploy script + tests
├── backend/             Node.js + Express + SQLite (better-sqlite3) + ethers
├── src/                 React + Vite + Tailwind dashboard
└── .env                 Shared config (RPC URL, deployer key, ports)
```

## Prerequisites

- Node.js 18+
- Three terminal windows (one per process)

## 1. Start the local blockchain

```bash
cd blockchain
npm install
npx hardhat node
```

Keep this terminal running. It prints 20 test accounts and listens on
`http://127.0.0.1:8545`.

## 2. Deploy the smart contract

In a **new** terminal:

```bash
cd blockchain
npm run compile
npm run deploy:local
```

This deploys `ParkingRegistry` to the local network and writes
`backend/blockchain.json` (address + ABI) so the backend and frontend can find
it automatically.

Run the contract tests any time:

```bash
cd blockchain
npm test
```

## 3. Start the backend

In a **new** terminal:

```bash
cd backend
npm install
npm start
```

The API listens on `http://localhost:4000`. It creates `backend/data/parking.db`
and seeds 24 parking slots on first run. On startup it logs the deployed
contract address; if `blockchain.json` is missing it warns you to deploy first.

## 4. Start the frontend

In a **new** terminal, from the project root:

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`). The dashboard loads live
data from the backend.

## End-to-end flow

1. On the **Dashboard** tab, the availability cards show total / available /
   reserved / occupied counts. Click any green (available) slot in the grid.
2. Fill in vehicle number, driver name, date, time, and duration, then click
   **Reserve Slot**. The backend validates the request, checks for duplicate
   active reservations and slot conflicts, stores the reservation in SQLite,
   sends a `reserve()` transaction to the smart contract, waits for 1
   confirmation, and stores the **real** tx hash + block number back in SQLite.
3. The slot turns amber (reserved) and the reservation appears in the
   **Reservations** tab with its tx hash.
4. On the **Violations** tab, log a violation (type, vehicle, fine). It is
   recorded on-chain via `logViolation()`. Pay the fine with **Pay Fine**, which
   calls `payFine()` on-chain.
5. The **Transactions** tab lists every action with its real tx hash, block
   number, and confirmation status.
6. The **Verification** tab reads each stored tx hash, looks up the matching
   record on the smart contract via `getRecord()`, and reports whether the
   on-chain data matches what SQLite stored.

## Important notes

- **Real hashes only.** The backend never fabricates a tx hash. If the Hardhat
  node is down or the contract is undeployed, write requests return HTTP 503
  with a clear message and no hash is stored.
- **Local dev network only.** The deployer private key in `.env` is Hardhat's
  deterministic account #0 — it has no real value and must never be used on a
  public network.
- **Data vs. chain state.** SQLite holds application state (slot occupancy,
  reservation metadata, fine payment status). The contract is an append-only
  audit ledger. The verification page is what reconciles the two.
- **Resetting data.** Delete `backend/data/parking.db` to reset SQLite, and
  restart `npx hardhat node` to reset the chain. Then redeploy the contract.

## API summary

| Method | Path                          | Purpose                          |
|--------|-------------------------------|----------------------------------|
| GET    | `/api/health`                 | Backend + blockchain connectivity|
| GET    | `/api/slots`                  | List all parking slots           |
| POST   | `/api/reservations`           | Create a reservation (on-chain)  |
| GET    | `/api/reservations`           | List reservations                |
| POST   | `/api/reservations/:id/cancel`| Cancel a reservation (on-chain)  |
| POST   | `/api/violations`             | Log a violation (on-chain)       |
| GET    | `/api/violations`             | List violations                  |
| POST   | `/api/violations/:id/pay`     | Pay a fine (on-chain)            |
| GET    | `/api/transactions`           | Full transaction history         |
| GET    | `/api/verify`                 | Cross-check on-chain records     |
```
