# Medical Device Image Checker

A professional web application designed to streamline the review and validation of medical device images and documentation. This tool helps medical professionals and regulatory teams efficiently process large datasets of medical devices by providing an intuitive interface for image selection, categorization, and quality control.

## 🎯 Purpose & Value

The Medical Device Image Checker addresses critical challenges in medical device data management:

- **Quality Assurance**: Ensures only high-quality, relevant images are selected for medical device documentation
- **Regulatory Compliance**: Helps maintain consistent standards for device imagery used in regulatory submissions
- **Efficiency**: Processes hundreds of devices in organized batches, significantly reducing manual review time
- **Traceability**: Maintains detailed records of reviewer decisions and notes for audit purposes
- **Standardization**: Provides consistent categorization using predefined material categories and subcategories

## 🔐 Security

This application requires Google OAuth authentication to ensure only authorized users can access medical device data:

- **Organization-Only Access**: Restrict access to specific email domains
- **Protected Routes**: All application routes require authentication
- **Session Management**: Secure session handling with NextAuth.js
- **Automatic Redirects**: Unauthenticated users are redirected to login

See [AUTH_SETUP.md](./AUTH_SETUP.md) for complete setup instructions.

## ✨ Key Features

### 📋 Batch Processing
- Organizes devices into manageable batches of 10 items
- Progress tracking across all batches
- Quick navigation between batches
- Visual progress indicators

### 🖼️ Image Management
- Multiple image options per device with thumbnail previews
- Primary image identification and custom selection
- Image loading with fallback handling
- Full-size image preview capabilities

### 📄 Documentation Handling
- Manual and IFU (Instructions for Use) document links
- Multiple manual options per device
- Direct links to manufacturer documentation

### 🏷️ Material Classification
- Comprehensive category system:
  - **SURGICAL INSTRUMENTS**
  - **IMPLANTS**
  - **FLUIDS & MEDICINES**
  - **DISPOSABLES** (with subcategories: Other Disposables, Draping, Prep, Staplers, Wound Care)
  - **OR INVENTORY** (with subcategories: Positioning Materials, Carts Caddys Lockers, Accessories, Other)
  - **SUTURES**

### ✅ Review Status Management
- **Approved**: Device and images meet quality standards
- **Custom Selected**: Alternative image chosen by reviewer
- **Rejected**: Device flagged for quality issues (included in export)
- **Skipped**: Device bypassed for review

### 📊 Export & Reporting
- CSV export with all device data and reviewer decisions
- Configurable export options (images, manuals, notes)
- Material category and subcategory columns
- Complete audit trail of review process

### 🗑️ Recently Deleted (14-Day Safety Net)
- **Soft Delete**: Deleted sessions retained for 14 days before permanent removal
- **One-Click Restore**: Easily recover accidentally deleted sessions
- **Days Remaining**: Clear countdown showing time until permanent deletion
- **Complete Recovery**: All progress and device data preserved
- **Color-Coded Warnings**: Red alerts for sessions expiring in ≤3 days

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Google OAuth credentials (for authentication)
- Vercel account with Postgres database (for production)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd image-checker
```

2. Install dependencies:
```bash
pnpm install
```

3. **Set up authentication** (see [AUTH_SETUP.md](./AUTH_SETUP.md) for detailed instructions):
   - Create Google OAuth credentials
   - Copy `.env.local.example` to `.env.local`
   - Add your OAuth credentials and generate an AUTH_SECRET
   - Configure allowed domains in `src/auth.ts`

4. **Set up Postgres database** (see [POSTGRES_SETUP.md](./POSTGRES_SETUP.md) for detailed instructions):
   - Create a Vercel Postgres database
   - Run the database initialization script
   - Configure environment variables

5. Start the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser and sign in with your Google account

### Usage

1. **Upload CSV**: Start by uploading a CSV file containing device data with the following columns:
   - `product_name`, `manufacturer`, `manuf_number`, `gmdn_terms`, `device_id`
   - `image_url`, `image_urls` (pipe-separated multiple URLs)
   - `manual_url`, `manual_urls` (pipe-separated multiple URLs)

2. **Review Devices**: Navigate through batches and review each device:
   - Select the best image from available options
   - Choose appropriate material category and subcategory
   - Set review status (Approve/Reject/Skip)
   - Add optional notes

3. **Export Results**: Download the completed review as a CSV file with all selections and categorizations

4. **Recently Deleted**: Access the "Recently Deleted" page from the header to:
   - View sessions deleted within the last 14 days
   - Restore accidentally deleted sessions with one click
   - See countdown timers for automatic permanent deletion

## 🛠️ Technical Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: Vercel Postgres (Neon) with optimistic locking
- **CSV Processing**: PapaParse
- **Icons**: Lucide React
- **Authentication**: NextAuth.js (Google OAuth)

## 📁 Project Structure

```
src/
├── app/                      # Next.js app router pages
│   ├── page.tsx              # Home page with session list
│   ├── deleted/              # Recently Deleted page
│   ├── check/[sessionId]/    # Device review interface
│   └── api/                  # API routes
│       └── sessions/         # Session management endpoints
├── components/               # Reusable UI components
│   ├── BatchHeader.tsx       # Batch navigation and progress
│   ├── DeviceRow.tsx         # Individual device review interface
│   ├── ExportModal.tsx       # Export configuration dialog
│   └── ImageWithFallback.tsx # Image loading component
├── lib/                      # Core utilities
│   └── db.ts                 # Database functions with soft-delete support
├── store/                    # Zustand state management
├── types/                    # TypeScript type definitions
└── utils/                    # Utility functions and constants
    ├── categories.ts         # Material category definitions
    └── csvParser.ts          # CSV processing utilities
scripts/
├── add-soft-delete.sql       # Database migration for soft-delete
└── cleanup-deleted-sessions.ts # Maintenance script for old sessions
```

## 🔧 Session Management

The application uses **Vercel Postgres** to store and manage review sessions, providing:

### Multi-User Support
- **Concurrent Access**: Multiple users can work on different sessions simultaneously
- **Optimistic Locking**: Prevents data loss from concurrent edits
- **Conflict Detection**: Alerts users when session conflicts occur
- **User Association**: Sessions can be linked to authenticated users

### Data Persistence
- **Cloud Storage**: All sessions stored in Postgres (not local storage)
- **Cross-Device Sync**: Access your sessions from any device
- **Auto-Save**: Progress automatically saved every 60 seconds
- **Manual Save**: Save anytime with the "Save Progress" button

### Session Recovery
- **Resume Work**: Continue sessions from any device
- **Version Control**: Track changes with version numbers
- **Activity Logging**: Full audit trail of all session changes
- **Recently Deleted**: 14-day safety net for accidentally deleted sessions
- **Automatic Cleanup**: Old deleted sessions removed automatically after retention period

See [POSTGRES_SETUP.md](./POSTGRES_SETUP.md) and [RECENTLY_DELETED.md](./RECENTLY_DELETED.md) for complete documentation.

## 📈 Performance Features

- **Lazy Loading**: Images load on-demand with loading states
- **Batch Processing**: Efficient handling of large datasets
- **Cloud Persistence**: Automatic progress saving to Postgres
- **Sub-10ms Queries**: Edge-optimized database queries with Neon
- **Connection Pooling**: Automatic scaling for concurrent users
- **Responsive Design**: Works on desktop and tablet devices
- **Indexed Soft-Delete**: Efficient querying of active vs deleted sessions

## 🛡️ Data Safety Features

- **14-Day Retention**: Deleted sessions preserved for recovery
- **Soft Delete System**: Sessions marked as deleted, not immediately removed
- **One-Click Restore**: Easy recovery from Recently Deleted page
- **Automatic Cleanup**: Sessions permanently removed after 14 days
- **Complete Data Preservation**: All progress, images, and notes retained during retention period
- **Activity Logging**: Full audit trail of deletions and restorations

Run `pnpm cleanup:deleted` to manually trigger cleanup of sessions older than 14 days.

## 🤝 Contributing

This application is designed for medical device professionals and regulatory teams. Contributions should maintain the high standards required for medical device documentation workflows.

## 📄 License

[Add your license information here]
