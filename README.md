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

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Google OAuth credentials (for authentication)

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

4. Start the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser and sign in with your Google account

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

## 🛠️ Technical Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persistence
- **CSV Processing**: PapaParse
- **Icons**: Lucide React

## 📁 Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
│   ├── BatchHeader.tsx  # Batch navigation and progress
│   ├── DeviceRow.tsx    # Individual device review interface
│   ├── ExportModal.tsx  # Export configuration dialog
│   └── ImageWithFallback.tsx # Image loading component
├── store/              # Zustand state management
├── types/              # TypeScript type definitions
└── utils/              # Utility functions and constants
    ├── categories.ts   # Material category definitions
    └── csvParser.ts    # CSV processing utilities
```

## 🔧 Configuration

The application uses local storage to persist review sessions, allowing users to:
- Resume work after browser refresh
- Maintain progress across sessions
- Recover from unexpected interruptions

## 📈 Performance Features

- **Lazy Loading**: Images load on-demand with loading states
- **Batch Processing**: Efficient handling of large datasets
- **Local Persistence**: Automatic progress saving
- **Responsive Design**: Works on desktop and tablet devices

## 🤝 Contributing

This application is designed for medical device professionals and regulatory teams. Contributions should maintain the high standards required for medical device documentation workflows.

## 📄 License

[Add your license information here]
