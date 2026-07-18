# Shop Management API Field Type Verification

## Backend Shop Creation API (POST /api/shops)

### Required Fields:
- `name` (string) - Shop name
- `type` (string) - Shop type (retail, wholesale, medicine, hardware, grocery, restaurant, electronics, clothing, general, other)

### Optional Fields:
- `address` (string) - Shop address
- `phone` (string) - Shop phone  
- `email` (string) - Shop email
- `gstNumber` (string) - GST number
- `logo` (string) - Shop logo URL
- `settings` (object) - Shop settings object

### Backend Validation:
```javascript
if (!name || !type) {
  return res.status(400).json({ 
    error: 'Shop name and type are required' 
  });
}
```

## Frontend Shop Creation Form

### Required Fields:
- Shop Name (TextInput) -> `name`
- Shop Type (Dropdown/Select) -> `type`

### Optional Fields:
- Address (TextInput) -> `address`
- Phone (TextInput) -> `phone`  
- Email (TextInput) -> `email`
- GST Number (TextInput) -> `gstNumber`
- Logo Upload -> `logo`

### Frontend Validation:
```javascript
// Required fields validation
if (!name.trim() || !type) {
  Alert.alert('Error', 'Shop name and type are required');
  return;
}
```

## Backend Response Format:
```javascript
{
  success: true,
  data: {
    id: "uuid",
    name: "Shop Name",
    type: "retail",
    address: "",
    phone: "",
    email: "",
    gstNumber: "",
    logo: "",
    settings: {
      currency: 'INR',
      taxEnabled: true,
      taxRate: 18,
      invoicePrefix: 'INV',
      lowStockAlert: true,
      minStockLevel: 10
    },
    role: 'admin',
    joinedAt: "2026-05-13T02:30:00.000Z",
    isActive: true
  }
}
```

## SQLite Schema Match:
### Shops Table:
```sql
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,           ✅
  type TEXT NOT NULL DEFAULT 'retail', ✅
  address TEXT,                 ✅
  phone TEXT,                  ✅
  email TEXT,                  ✅
  gstNumber TEXT,               ✅
  logo TEXT,                   ✅
  settings TEXT,                ✅
  createdAt TEXT NOT NULL,       ✅
  updatedAt TEXT NOT NULL,       ✅
  lastSyncAt TEXT,              ✅
  syncVersion INTEGER DEFAULT 1   ✅
)
```

### UserShops Junction Table:
```sql
CREATE TABLE IF NOT EXISTS user_shops (
  id TEXT PRIMARY KEY,           ✅
  userId TEXT NOT NULL,          ✅
  shopId TEXT NOT NULL,          ✅
  role TEXT NOT NULL DEFAULT 'cashier', ✅
  isActive BOOLEAN DEFAULT 1,     ✅
  isLocked BOOLEAN DEFAULT 0,      ✅
  joinedAt TEXT NOT NULL,          ✅
  permissions TEXT,               ✅
  createdAt TEXT NOT NULL,        ✅
  updatedAt TEXT NOT NULL,        ✅
  lastSyncAt TEXT,               ✅
  syncVersion INTEGER DEFAULT 1,   ✅
  UNIQUE(userId, shopId),        ✅
  FOREIGN KEY (userId) REFERENCES users(id), ✅
  FOREIGN KEY (shopId) REFERENCES shops(id)   ✅
)
```

## Frontend API Service Integration:
### APIService.js Shop Methods Needed:
```javascript
// Add to APIService.js
async createShop(shopData) {
  try {
    const response = await api.post('/shops', shopData);
    return response.data;
  } catch (error) {
    throw error;
  }
}

async getUserShops() {
  try {
    const response = await api.get('/shops');
    return response.data;
  } catch (error) {
    throw error;
  }
}

async updateShop(shopId, shopData) {
  try {
    const response = await api.put(`/shops/${shopId}`, shopData);
    return response.data;
  } catch (error) {
    throw error;
  }
}

async deleteShop(shopId) {
  try {
    const response = await api.delete(`/shops/${shopId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}
```

## Field Type Mappings:
| Frontend Field | Backend Field | SQLite Column | Type | Required |
|---------------|---------------|---------------|-------|----------|
| Shop Name | name | name | string | ✅ |
| Shop Type | type | type | string | ✅ |
| Address | address | address | string | ❌ |
| Phone | phone | phone | string | ❌ |
| Email | email | email | string | ❌ |
| GST Number | gstNumber | gstNumber | string | ❌ |
| Logo | logo | logo | string | ❌ |

## Validation Rules:
1. **Shop Name**: Required, unique per user, max 255 chars
2. **Shop Type**: Required, must be one of enum values
3. **Address**: Optional, max 500 chars
4. **Phone**: Optional, max 20 chars
5. **Email**: Optional, valid email format
6. **GST Number**: Optional, max 50 chars
7. **Logo**: Optional, URL or base64 string

## Error Handling:
- 400: Validation errors (missing required fields)
- 401: Authentication errors (invalid token)
- 403: Permission errors (can't manage shop)
- 404: Shop not found
- 500: Server errors
