# Flow Farmers Market Website

A modern website for Flow Farmers Market, featuring vendor applications, newsletter signups, and an admin portal.

## Features

- **Public Website**: Information about the market, vendors, and schedule
- **Vendor Application**: Form for prospective vendors to apply
- **Newsletter Signup**: Email collection for market updates
- **Admin Portal**: Password-protected admin area for managing vendors and the mailing list

## Admin Portal

To access the admin portal, navigate to `/admin` on the website. You will be prompted for a password.

**Password**: `flowlife123`

### Vendor Management

The vendor portal allows administrators to:

1. **View all vendor applications** with their details and AI-generated reviews
2. **Filter vendors** by status (pending, approved, rejected, removed)
3. **Search vendors** by business name or email
4. **View detailed information** about each vendor, including:
   - Contact information
   - Product type
   - Sustainability practices
   - Application date
   - AI review notes
5. **Re-trigger AI reviews** of vendor applications
6. **Remove vendors** who violate market policies (without deleting their data)
7. **Restore removed vendors** if needed

### Mailing List Management

The mailing list section displays all subscribers to the market newsletter.

## Development

This website is built with:

- Next.js 15.2
- Tailwind CSS
- Supabase (for database and authentication)
- TypeScript

To run the development server:

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) to view the site.

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
