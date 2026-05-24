# AuraSales | Premium Sales & Accounting Tracker

A futuristic, glassmorphic SaaS dashboard for tracking daily sales, profits, expenses, and customer credits.

## Tech Stack
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Animations**: Framer Motion
- **Database**: MongoDB with Mongoose
- **Auth**: JWT with Jose (Edge compatible)
- **UI Components**: Custom Glassmorphic Design System

## Features
- **Daily Dashboard**: Real-time stats and analytics charts.
- **Inventory Management**: Track stock levels, cost, and selling prices.
- **Sales System**: Support for Cash, UPI, and Credit sales with auto-stock reduction.
- **Customer Ledger**: Track dues and record settlements.
- **Expense Tracking**: Categorized daily expense logging.
- **Cinematic Reports**: Profit & Loss summaries and business intelligence.
- **Premium UI**: Liquid background, aurora glows, and frosted glass panels.

## Getting Started

1. **Environment Setup**:
   - Rename `.env.local` placeholders with your actual **MONGODB_URI**.
   - Set a strong **JWT_SECRET**.

2. **Installation**:
   ```bash
   npm install
   ```

3. **Initialize Admin**:
   - Run the development server: `npm run dev`
   - Visit `http://localhost:3000/api/setup` once to create the default admin account.
   - **Default Credentials**: 
     - Username: `admin`
     - Password: `admin123` (Please change this in settings immediately).

4. **Development**:
   ```bash
   npm run dev
   ```

## Production Deployment
The application is ready for deployment on **Vercel**. Ensure all environment variables are added in the Vercel dashboard.

---
Built with ❤️ by Antigravity AI
