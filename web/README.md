# Retail ERP Web Application

A modern web-based ERP system for retail management, built with React, TypeScript, and TailwindCSS. This web application works alongside the existing mobile app and shares the same backend API.

## Features

- **Dashboard**: Real-time overview of sales, customers, products, and inventory
- **Product Management**: Add, edit, delete products with stock tracking
- **Customer Management**: Complete customer database with credit tracking
- **Sales & Billing**: Full-featured point-of-sale system
- **Inventory Management**: Real-time stock tracking with low-stock alerts
- **Reports & Analytics**: Comprehensive business insights and charts
- **Settings**: User profile, shop settings, notifications, and security

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend server running on http://localhost:5000

## Installation

1. **Navigate to the web directory**
```bash
cd web
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

The application will be available at http://localhost:5173

## Configuration

### API Base URL

Update the API base URL in `src/services/api.ts` if your backend is running on a different port:

```typescript
const API_BASE_URL = 'http://localhost:5000/api';
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

## Project Structure

```
web/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Products.tsx
│   │   ├── Customers.tsx
│   │   ├── Sales.tsx
│   │   ├── Inventory.tsx
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   ├── services/       # API services
│   │   └── api.ts
│   ├── store/          # State management
│   │   └── authStore.ts
│   ├── lib/            # Utility functions
│   │   └── utils.ts
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## API Integration

The web application connects to the existing backend API at `http://localhost:5000/api`. All API calls are handled through the centralized `api` service in `src/services/api.ts`.

### Available API Endpoints

- **Authentication**: `/auth/login`, `/auth/register`, `/auth/verify`
- **Shops**: `/shops/:id`, `/shops/`, `/shops/:id/users`
- **Products**: `/products/shop/:shopId`, `/products/:id`, `/products/`
- **Customers**: `/customers/shop/:shopId`, `/customers/:id`, `/customers/`
- **Sales**: `/sales/shop/:shopId`, `/sales/:id`, `/sales/`
- **Inventory**: `/inventory/shop/:shopId/logs`, `/inventory/shop/:shopId/low-stock`
- **Reports**: `/sales/shop/:shopId/summary`
- **SMS**: `/sms/shop/:shopId/logs`, `/sms/send`

## Development

### Adding New Pages

1. Create a new page component in `src/pages/`
2. Add the route in `src/App.tsx`
3. Update the navigation in `src/pages/Dashboard.tsx`

### Styling

The application uses TailwindCSS for styling. Custom utilities can be added to `tailwind.config.js`.

### State Management

Zustand is used for global state management. Currently implemented:
- `authStore` - User authentication state

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment

The application can be deployed to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

## Troubleshooting

### API Connection Issues

If the web app cannot connect to the backend:
1. Ensure the backend server is running on port 5000
2. Check CORS settings in the backend
3. Verify the API_BASE_URL in `src/services/api.ts`

### Build Errors

If you encounter build errors:
1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall dependencies: `npm install`
3. Clear Vite cache: `rm -rf .vite dist`

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
