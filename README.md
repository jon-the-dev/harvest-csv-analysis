# Harvest Time Entry Analyzer

A comprehensive client-side React application for analyzing and visualizing time tracking data from Harvest CSV exports. Built with modern web technologies and designed for AWS serverless deployment.

## Features

### 🎯 Core Functionality
- **100% Client-Side Processing**: All data processing happens in the browser for maximum privacy and security
- **CSV Upload & Parsing**: Direct upload of Harvest time entry exports with robust parsing
- **Real-Time Filtering**: Dynamic filtering by employee, client, project, task, and date range
- **Automatic Name Combination**: Merges First Name and Last Name columns into Full Name

### 📊 Analytics & Insights
- **Weekly Utilization Tracking**: Monday-Sunday calculations with automatic alerts
  - Low utilization: < 30 hours/week (yellow alerts)
  - High utilization: > 45 hours/week (red alerts)
- **Internal vs External Time Separation**: Automatic identification of internal clients (Onica, Rackspace Innovation In Action)
- **Recognition System**: Automatic shoutouts for high performers (35+ billable hours, 90%+ utilization)

### 📈 Visualizations
- Task Word Cloud
- Client Hours Distribution
- Project Analytics with billability rates
- Internal vs External Pie Chart
- Monthly Trend Charts

### 🔍 Drill-Down Capabilities
- Hierarchical navigation: Client → Project → Task → Entry
- Cascading filters with automatic reset
- Expandable/collapsible detail views
- Date-sorted entries (newest first)

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jon-the-dev/harvest-csv-analysis.git
cd harvest-csv-analysis/web-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to http://localhost:3000

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## Usage

1. **Upload CSV**: Click "Upload CSV" and select your Harvest time entries export
2. **Filter Data**: Use the dropdown filters to narrow your view
3. **Explore Tabs**:
   - **Overview**: High-level statistics and visualizations
   - **Utilization**: Weekly breakdowns and alerts
   - **Internal**: Detailed drill-down for internal time attribution
   - **Insights**: Client and project analytics
   - **Details**: Raw data table

## CSV Format Requirements

The application expects standard Harvest CSV exports with these columns:
- Date
- Client
- Project
- Task
- Hours
- Billable?
- First Name
- Last Name
- (Additional columns are preserved but not required)

## Deployment

### AWS S3 Static Hosting

1. Build the application:
```bash
npm run build
```

2. Create an S3 bucket with static website hosting enabled

3. Upload the contents of the `dist` directory to your S3 bucket:
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

4. Configure bucket policy for public access:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

### CloudFront Distribution (Recommended)

For better performance and HTTPS support:
1. Create a CloudFront distribution
2. Set your S3 bucket as the origin
3. Configure caching behaviors
4. Use AWS Certificate Manager for SSL

## Technical Stack

- **React 18**: Modern UI framework
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Data visualization
- **PapaParse**: CSV parsing

## Security & Privacy

- All data processing happens client-side
- No data is sent to external servers
- No persistent storage of sensitive data
- Files are processed in browser memory only

## Project Structure

```
harvest-csv-analysis/
├── web-app/
│   ├── src/
│   │   ├── App.jsx          # Main application component
│   │   ├── main.jsx         # Application entry point
│   │   └── index.css        # Tailwind CSS imports
│   ├── package.json         # Dependencies and scripts
│   ├── vite.config.js       # Vite configuration
│   ├── tailwind.config.js   # Tailwind configuration
│   └── index.html           # HTML template
├── docs/                    # Documentation
└── README.md               # This file
```

## Development

### Running Linting

```bash
npm run lint
```

### Code Style

- ESLint configuration included
- Tailwind CSS for styling
- React best practices

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built for Tier One Solutions
- Designed to work with Harvest time tracking exports
- Optimized for AWS serverless deployment

## Support

For issues or questions, please create an issue in the GitHub repository.

---

**Documentation**: Full documentation available in [Confluence](https://zerodaysec.atlassian.net/wiki/spaces/TOS/pages/2222096390/)