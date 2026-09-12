# InboxClean - MVP SaaS Application

A privacy-first Gmail inbox cleanup and newsletter management tool. Bulk unsubscribe from newsletters and clean up promotional emails in seconds.

## Features

- **Bulk Unsubscribe**: Unsubscribe from multiple newsletters at once
- **Inbox Cleanup**: Archive or trash old promotional emails
- **Privacy First**: All data processing happens in your browser
- **Gmail Integration**: Connect securely via OAuth
- **Separate Actions**: Unsubscribe and cleanup are independent operations

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Authentication**: Google OAuth
- **Email**: Gmail API
- **State**: In-memory + localStorage (no database required for MVP)

## Project Structure

```
inboxclean/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # Dashboard page
│   ├── subscriptions/     # Subscriptions management
│   ├── cleanup/           # Email cleanup
│   ├── settings/          # User settings
│   ├── api/               # API routes (Phase 2+)
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   └── layout/            # Layout components
│       ├── Header.tsx
│       └── Sidebar.tsx
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
├── utils/                 # Utility functions
├── lib/                   # Library utilities
├── .env.local            # Environment variables
├── tailwind.config.ts    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm/yarn
- Google OAuth credentials (from Google Cloud Console)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables** in `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**:
   ```
   http://localhost:3000
   ```

## Pages

### Landing Page (`/`)
- Clean SaaS design with hero section
- Feature highlights
- How it works section
- CTA to connect Gmail

### Dashboard (`/dashboard`)
- Total promotional emails count
- Active senders count
- Storage estimate
- Quick action buttons
- Recent activity log

### Subscriptions (`/subscriptions`)
- List of all promotional senders
- Email count per sender
- Last received date
- Bulk unsubscribe actions
- Individual unsubscribe/block options

### Cleanup (`/cleanup`)
- Grouped sender cleanup interface
- Bulk selection
- Confirmation modal before cleanup
- Trash or archive actions
- Email count preview

### Settings (`/settings`)
- Disconnect Gmail account
- Privacy information
- Data management options
- Help & support links

## Development Phases

### Phase 1 ✅ (Current)
- Project setup
- Tailwind CSS configuration
- shadcn/ui components
- Routing and basic pages
- UI components (Button, Card, Modal)
- Layout components (Header, Sidebar)

### Phase 2 (Next)
- Google OAuth implementation
- Gmail API connection
- User authentication flow

### Phase 3
- Fetch promotional emails from Gmail
- Group emails by sender
- Display sender statistics

### Phase 4
- Implement cleanup actions (trash/archive)
- Gmail API integration for bulk operations
- Undo support

### Phase 5
- Unsubscribe functionality
- List-Unsubscribe header support
- Standard unsubscribe links

### Phase 6
- UI polish
- Loading states
- Error handling
- Performance optimization

## Testing Locally

### Test Landing Page
```bash
npm run dev
# Visit http://localhost:3000
```

### Test Navigation
- Click "Connect Gmail" to navigate to dashboard
- Use sidebar to navigate between pages
- Test responsive design on mobile

### Test UI Components
- Button variants: primary, secondary, danger, ghost
- Card layouts with header, content, footer
- Modal confirmation dialogs
- Checkbox selections

## Key Design Decisions

1. **No Database Initially**: Using localStorage for MVP to reduce complexity
2. **Client-Side Processing**: All email data processing happens in browser for privacy
3. **Separate Unsubscribe/Cleanup**: Users can unsubscribe without cleaning old emails
4. **Confirmation Modals**: Always confirm before bulk actions
5. **Trash Over Delete**: Never permanently delete; move to trash first

## Important UX Rules

1. Never permanently delete emails initially
2. Always show confirmation modal for bulk cleanup
3. Keep unsubscribe and cleanup completely separate
4. Add undo support wherever possible
5. Show email counts before actions

## Next Steps

1. Install dependencies: `npm install`
2. Set up Google OAuth credentials
3. Configure `.env.local` with credentials
4. Run `npm run dev` to start development
5. Proceed to Phase 2 for authentication implementation

## License

MIT
