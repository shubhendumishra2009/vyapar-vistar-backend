# Start Backend Server

## Quick Start

1. **Open terminal in backend directory:**
   ```bash
   cd d:/Projects/VyaparVistar/backend
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

## Server Details

- **URL**: http://localhost:5000
- **MongoDB**: Connected to your Atlas cluster
- **API Endpoints**: Available at http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## Available Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/refresh` - Refresh token

### Shops
- `GET /api/shops/:id` - Get shop details
- `POST /api/shops/` - Create new shop
- `PUT /api/shops/:id` - Update shop
- `GET /api/shops/:id/users` - Get shop users

### Products
- `GET /api/products/shop/:shopId` - Get products
- `GET /api/products/:id` - Get single product
- `POST /api/products/` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/shop/:shopId/low-stock` - Low stock products
- `GET /api/products/shop/:shopId/categories` - Get categories

### Customers
- `GET /api/customers/shop/:shopId` - Get customers
- `GET /api/customers/:id` - Get single customer
- `POST /api/customers/` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/shop/:shopId/credit-outstanding` - Credit customers

### Sales/Transactions
- `GET /api/sales/shop/:shopId` - Get transactions
- `GET /api/sales/:id` - Get single transaction
- `POST /api/sales/` - Create transaction
- `PUT /api/sales/:id` - Update transaction
- `DELETE /api/sales/:id` - Delete transaction
- `GET /api/sales/shop/:shopId/summary` - Sales summary

### Inventory
- `GET /api/inventory/shop/:shopId/logs` - Inventory logs
- `GET /api/inventory/shop/:shopId/low-stock` - Low stock
- `GET /api/inventory/shop/:shopId/out-of-stock` - Out of stock
- `PUT /api/inventory/shop/:shopId/product/:productId/stock` - Update stock
- `GET /api/inventory/shop/:shopId/value` - Inventory value
- `GET /api/inventory/shop/:shopId/summary` - Inventory summary

### SMS
- `GET /api/sms/shop/:shopId/logs` - SMS logs
- `POST /api/sms/send` - Send SMS
- `GET /api/sms/shop/:shopId/templates` - SMS templates
- `POST /api/sms/bulk` - Bulk SMS

### Sync
- `POST /api/sync/upload` - Upload data to server
- `GET /api/sync/download/:shopId` - Download data from server
- `POST /api/sync/check-conflicts` - Check for conflicts
- `GET /api/sync/status/:shopId` - Get sync status

## Testing

You can test the server using Postman or curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@test.com","password":"admin123","name":"Admin User","shopId":"your_shop_id","type":"admin"}'
```

## Next Steps

1. **Start the server** with `npm run dev`
2. **Test API endpoints** with Postman or curl
3. **Update mobile app** to connect to http://localhost:5000
4. **Test sync functionality** between mobile app and backend

The server is now ready for your hybrid MongoDB + SQLite architecture!
