# Visual Analyzer 🎯

AI-powered creative analysis tool for banner ads and marketing materials.

## ✨ Features

- **🔍 Dual-API OCR** - Google Vision + Azure Vision with consensus scoring
- **📝 Smart Text QA** - Czech + English support, brand-aware spell checking
- **🎨 Visual Analysis** - 4 dimensions: Attractiveness, Clarity, Trust, CTA Effectiveness
- **🔥 Attention Heatmaps** - AI-predicted attention zones
- **⚡ Batch Processing** - Analyze multiple creatives at once
- **📊 CSV Export** - Comprehensive data export for analysis

## 🏗️ Tech Stack

### Frontend
- Next.js 14 (React, TypeScript)
- Tailwind CSS
- Recharts for visualizations

### Backend
- NestJS (TypeScript)
- Prisma ORM
- BullMQ for background jobs
- PostgreSQL database
- Redis for queue

### AI/ML Services
- Google Gemini 2.5 Flash Lite
- Google Cloud Vision API
- Azure AI Vision API

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Google Cloud account (for Vision & Gemini APIs)
- Azure account (optional, for dual-OCR)

## 🚀 Quick Start

See [SETUP.md](./SETUP.md) for detailed installation instructions.

## 📊 Analysis Sections

The tool provides 4 comprehensive analysis sections:

### A. OCR & Extracted Text
- Dual-API text extraction
- Confidence scoring
- Consensus between providers

### B. Text Quality Analysis
- Spell checking (Czech + English)
- Grammar validation
- Banner-specific checks (excessive punctuation, etc.)
- Brand name detection

### C. Visual Scoring
- **Attractiveness** - Visual appeal and design quality
- **Clarity** - Message clarity and readability
- **Trust** - Professional appearance and credibility
- **CTA Effectiveness** - Call-to-action prominence

### D. Senior Reviewer Recommendations
- AI-generated improvement suggestions
- Actionable feedback
- Best practice recommendations

## 🎯 Use Cases

- Marketing agencies reviewing client creatives
- In-house marketing teams optimizing campaigns
- Freelance designers validating work
- A/B testing preparation

## 📈 Performance

- **Analysis time:** 7-13 seconds per creative
- **Capacity:** 750 creatives/day (with text filtering)
- **Monthly cost:** ~$1.40 for 700 creatives (AI API usage)

## 🔒 Security

- JWT-based authentication
- Workspace isolation
- Environment-based secrets
- CORS protection

## 📄 License

Private - All Rights Reserved

## 👨‍💻 Author

Created for creative analysis and quality assurance workflows.
