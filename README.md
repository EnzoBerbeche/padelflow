# PadelFlow - Tournament Management Platform

A professional padel tournament organization and management platform built with Next.js, TypeScript, and Clerk authentication.

## Features

- **User Authentication**: Secure sign-in/sign-up with Clerk
- **Tournament Management**: Create, edit, and manage tournaments
- **Player Management**: Add, edit, and organize players with detailed information
- **Advanced Filtering**: Excel-style column filters and search functionality
- **Responsive Design**: Modern UI with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd padelflow
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key_here
CLERK_SECRET_KEY=your_secret_key_here

# Clerk URLs (for development)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Setting up Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Get your API keys from the dashboard
4. Replace the placeholder values in `.env.local` with your actual keys

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── dashboard/         # Protected dashboard routes
│   ├── sign-in/          # Authentication pages
│   ├── sign-up/          # Authentication pages
│   └── layout.tsx        # Root layout with ClerkProvider
├── components/            # Reusable components
│   ├── dashboard-layout.tsx
│   ├── protected-route.tsx
│   └── ui/               # UI components
├── lib/                  # Utilities and storage
│   └── storage.ts        # Local storage management
├── middleware.ts         # Authentication middleware
└── .env.local           # Environment variables
```

## Authentication Flow

- **Public Routes**: Home page, sign-in, sign-up
- **Protected Routes**: All dashboard pages require authentication
- **Automatic Redirects**: Unauthenticated users are redirected to sign-in
- **User Management**: Built-in user profile and sign-out functionality

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your Clerk environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

Make sure to set the environment variables in your hosting platform's dashboard.

## Features in Detail

### Tournament Management
- Create tournaments with detailed information
- Manage tournament formats and brackets
- Track tournament progress and results

### Player Management
- Add players with comprehensive information (name, license, ranking, club, etc.)
- Advanced filtering and search capabilities
- Visual gender indicators and ranking badges

### User Interface
- Modern, responsive design
- Excel-style column filters
- Real-time search functionality
- Professional dashboard layout

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License. 