# MySQL Setup Guide for VyaparVistar

## Prerequisites
- MySQL Server installed on your system
- MySQL command line tool or MySQL Workbench

## Step 1: Create Database

### Option A: Using MySQL Command Line
```bash
mysql -u root -p
```

Then run:
```sql
CREATE DATABASE IF NOT EXISTS vyaparvistar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'vyapar_user'@'localhost' IDENTIFIED BY 'vyapar123';
GRANT ALL PRIVILEGES ON vyaparvistar.* TO 'vyapar_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Option B: Using MySQL Workbench
1. Open MySQL Workbench
2. Connect to your MySQL server
3. Run the above SQL commands in the query editor

## Step 2: Update .env Configuration

Update your `.env` file with the correct MySQL credentials:

```env
# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=vyapar_user
DB_PASSWORD=vyapar123
DB_NAME=vyaparvistar
```

If you prefer to use the root user (not recommended for production):

```env
# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_root_password
DB_NAME=vyaparvistar
```

## Step 3: Start the Backend Server

```bash
cd backend
npm start
```

The server will automatically create all necessary tables using Sequelize migrations.

## Troubleshooting

### Error: "Access denied for user 'root'@'localhost' (using password: NO)"
- This means MySQL requires a password but none is provided
- Update DB_PASSWORD in your .env file with your MySQL password

### Error: "Can't connect to MySQL server"
- Make sure MySQL server is running
- Check that DB_HOST and DB_PORT are correct
- Verify firewall settings

### Error: "Database doesn't exist"
- Run the database creation commands from Step 1
- Verify DB_NAME in .env matches the created database

## Security Notes

1. **For Development**: Using root user is acceptable but not recommended
2. **For Production**: Always create a dedicated database user with limited permissions
3. **Password Security**: Use strong passwords and never commit them to version control

## Default Database Schema

The application will automatically create the following tables:
- `shops` - Store/shop information
- `users` - User accounts and authentication
- `customers` - Customer management
- `products` - Product inventory
- `transactions` - Sales and purchase transactions

All tables include proper indexes for performance and foreign key relationships for data integrity.
