# Retail ERP Mobile App

A comprehensive React Native mobile application for managing retail shops with complete ERP functionality including SMS payment reminders for credit customers.

## Features

### 🏪 Core ERP Features
- **Product Management**: Add, edit, delete products with stock tracking
- **Customer Management**: Complete customer database with credit tracking
- **Sales & Billing**: Full-featured point-of-sale system with multiple payment methods
- **Inventory Management**: Real-time stock tracking with low-stock alerts
- **Analytics & Reports**: Comprehensive business insights and charts

### 💳 Credit Customer Management
- Credit limit management
- Outstanding balance tracking
- Payment history
- Credit customer identification

### 📱 SMS Features
- Automated payment reminders
- Custom SMS templates
- Bulk SMS sending
- SMS delivery tracking
- Payment confirmation messages

### 👥 User Management
- Multi-user support with role-based permissions
- Admin, Manager, Cashier, and Salesperson roles
- Secure authentication system

### 📊 Dashboard
- Real-time sales overview
- Customer statistics
- Inventory alerts
- Quick actions for common tasks

## Tech Stack

- **Frontend**: React Native 0.72.6
- **Database**: SQLite (react-native-sqlite-storage)
- **Navigation**: React Navigation 6
- **UI Components**: React Native Paper
- **Icons**: React Native Vector Icons
- **Charts**: React Native Chart Kit
- **State Management**: React Context API

## Installation

### Prerequisites
- Node.js (v14 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd RetailERP
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Install React Native dependencies**
```bash
npx react-native link
```

4. **For Android**
```bash
npx react-native run-android
```

5. **For iOS**
```bash
cd ios
pod install
cd ..
npx react-native run-ios
```

## Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

## App Structure

```
src/
├── App.js                 # Main app component
├── contexts/              # React Context providers
│   ├── AuthContext.js    # Authentication context
│   └── DatabaseContext.js # Database context
├── navigation/            # Navigation configuration
│   └── AppNavigator.js   # Main navigator
├── screens/               # Screen components
│   ├── auth/             # Authentication screens
│   ├── products/         # Product management
│   ├── customers/        # Customer management
│   ├── sales/           # Sales and billing
│   ├── inventory/       # Inventory management
│   ├── sms/             # SMS functionality
│   ├── reports/         # Analytics and reports
│   └── DashboardScreen.js
├── services/             # Business logic
│   └── DatabaseService.js
├── types/               # Type definitions
└── constants/           # App constants
```

## Database Schema

The app uses SQLite with the following main tables:

- **shops**: Shop information and settings
- **users**: User accounts and permissions
- **products**: Product catalog with inventory
- **customers**: Customer database with credit tracking
- **transactions**: Sales and payment records
- **inventory_logs**: Stock movement history
- **sms_logs**: SMS message tracking
- **sms_templates**: Customizable SMS templates

## Key Features Explained

### 1. Product Management
- Add products with SKU, barcode, pricing, and stock
- Real-time stock tracking
- Low stock alerts
- Category and brand management

### 2. Customer Management
- Complete customer profiles
- Credit customer support
- Outstanding balance tracking
- Payment history

### 3. Sales System
- Point-of-sale interface
- Multiple payment methods (cash, card, UPI, credit)
- Invoice generation
- Tax and discount calculation

### 4. SMS Integration
- Automated payment reminders
- Custom message templates
- Bulk SMS capability
- Delivery status tracking

### 5. Inventory Management
- Real-time stock updates
- Stock adjustment with reasons
- Low stock notifications
- Inventory value tracking

### 6. Analytics & Reports
- Sales trends and charts
- Top selling products
- Customer statistics
- Inventory status reports

## Permissions

The app supports role-based permissions:

- **Admin**: Full access to all features
- **Manager**: Can manage products, customers, and view reports
- **Cashier**: Can process sales and manage basic operations
- **Salesperson**: Limited to sales and customer management

## SMS Templates

Default SMS templates include:

- **Payment Reminder**: Automated reminders for outstanding payments
- **Payment Received**: Confirmation messages for received payments
- **New Order**: Order confirmations
- **Promotional**: Marketing messages

## Settings Configuration

Customizable settings include:

- Shop information (name, address, contact details)
- Tax configuration
- SMS enable/disable
- Printing preferences
- Barcode scanning
- Low stock thresholds

## Data Security

- Local SQLite database for offline access
- Secure user authentication
- Role-based access control
- Data backup and restore capabilities

## Troubleshooting

### Common Issues

1. **Database Initialization Error**
   - Clear app data and restart
   - Check SQLite plugin installation

2. **SMS Not Working**
   - Ensure SMS permissions are granted
   - Check device SMS settings

3. **Navigation Issues**
   - Verify React Navigation installation
   - Check screen component exports

4. **Build Errors**
   - Run `npm install` to update dependencies
   - Clean build folder and rebuild

## Development

### Adding New Features

1. Create screen components in `src/screens/`
2. Add navigation routes in `AppNavigator.js`
3. Update database schema if needed
4. Add context providers if required

### Database Modifications

1. Update `DatabaseService.js` schema
2. Handle migrations for existing data
3. Update related service methods

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Note**: This is a complete ERP solution designed for small to medium retail businesses. All data is stored locally on the device for privacy and offline access.
