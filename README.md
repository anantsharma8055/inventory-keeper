# Plywood Shop Inventory and Billing Backend

A beginner-friendly backend project for managing plywood products and generating bills.

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose

## Features

- Product management APIs:
  - Add product
  - Get all products
  - Update product
  - Delete product
- Billing API:
  - Accepts multiple items
  - Calculates total bill
  - Reduces product stock
  - Prevents billing when stock is insufficient
- Basic error handling for validation and invalid IDs
- Clean folder structure (`models`, `controllers`, `routes`)

## Project Structure

```text
inventory-keeper/
├── config/
│   └── db.js
├── controllers/
│   ├── billController.js
│   └── productController.js
├── middleware/
│   └── errorHandler.js
├── models/
│   └── Product.js
├── routes/
│   ├── billRoutes.js
│   └── productRoutes.js
├── .env.example
├── package.json
├── README.md
└── server.js
```

## Setup Instructions

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB connection string:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/plywood_shop
```

4. Start the server:

```bash
npm start
```

Server runs at: `http://localhost:5000`

## API Endpoints

### Health Check

- `GET /`

Response:

```json
{
  "message": "Plywood Inventory API is running"
}
```

### 1) Add Product

- `POST /products`

Sample request body:

```json
{
  "name": "MR Grade Plywood",
  "category": "Plywood",
  "brand": "GreenWood",
  "thickness": "18mm",
  "size": "8x4",
  "purchasePrice": 1450,
  "sellingPrice": 1750,
  "quantity": 50
}
```

### 2) Get All Products

- `GET /products`

### 3) Update Product

- `PUT /products/:id`

Sample request body:

```json
{
  "sellingPrice": 1800,
  "quantity": 45
}
```

### 4) Delete Product

- `DELETE /products/:id`

### 5) Create Bill

- `POST /bill`

Sample request body:

```json
{
  "items": [
    {
      "productId": "661b0f2a91f8a739e95d1111",
      "quantity": 2
    },
    {
      "productId": "661b0f2a91f8a739e95d2222",
      "quantity": 1
    }
  ]
}
```

Sample success response:

```json
{
  "message": "Bill created successfully",
  "data": {
    "items": [
      {
        "productId": "661b0f2a91f8a739e95d1111",
        "name": "MR Grade Plywood",
        "quantity": 2,
        "pricePerUnit": 1750,
        "itemTotal": 3500
      }
    ],
    "totalPrice": 3500
  }
}
```

## Notes

- Billing fails if any product has insufficient stock.
- Product quantity is reduced only when billing is successful.
- MongoDB transactions are used in billing, so use a MongoDB setup that supports transactions (Replica Set / Atlas).
