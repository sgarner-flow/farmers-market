# Flow Farmers Market

A modern web application for connecting local farmers and artisans with their community. Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- Modern, responsive landing page
- Supabase Authentication for user management
- Supabase Database for vendor and market data
- Vendor application system
- Newsletter signup
- Vendor directory

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Supabase project

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd farmers-market
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your Supabase configuration:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/src/app` - Next.js 14 app router pages and layouts
- `/src/components` - Reusable React components
- `/src/lib` - Utility functions and Supabase configuration
- `/public` - Static assets

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
