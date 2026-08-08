# 🚀 HealthTrack AI (Aura Health)
> **Offline-First WASM Epidemic Surveillance, Multilingual AI Field Triage & GIS Outbreak Command Engine**
>
> *Designed for Rural ASHA Healthcare Workers & District Chief Medical Officers across India.*
>
> LIVE URL : https://aura-health-oc4z.onrender.com

---

![HealthTrack AI Banner](https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&auto=format&fit=crop&q=80)

---

## 🌟 Executive Summary

In rural and remote regions of India, healthcare access is constrained by unreliable cellular connectivity, language barriers, and delayed epidemic outbreak responses. **HealthTrack AI** is a state-of-the-art Progressive Web Application (PWA) that empowers front-line **ASHA (Accredited Social Health Activists)** and **Chief District Medical Officers (CMOH)** with:

1. **100% Offline-First WASM AI Triage:** Local in-browser Machine Learning inference (377 clinical features) via WebAssembly.
2. **Multilingual Regional Voice Assistant:** Real-time voice-to-text triage powered by Sarvam AI supporting **15 Indian regional languages & dialects** (Bengali, Hindi, Bhojpuri, Maithili, Odia, etc.).
3. **1-Tap Emergency SMS & PIN Code GIS Hospital Solver:** Instant PIN code decoding across 300+ West Bengal medical facilities to auto-populate the nearest hospital's hotline phone number and generate a **pre-written emergency patient details message** for 1-tap cellular dispatch.
4. **DBSCAN Spatial Epidemic Clustering:** Outbreak vector detection, spatial contagion maps, and SIR epidemic forecasting curves.
5. **Real-Time Hospital Bed Reservation & Decrementing Engine:** Live facility bed capacity (Total, Available, ICU, Oxygen Beds, Ventilators) with interactive, stateful ICU bed reservations that decrement on-screen counters in real-time.
6. **CMOH Health Advisory Broadcast Modal:** Direct broadcast directive channel that pops up official CMO alerts on ASHA worker devices upon login.
7. **Domain-Restricted JWT Authentication:** Secure role-based access for ASHA Helpers (`*@helper.com`) and Health Officers (`*@gov.com`).

---

## 💡 Key Architectural Innovations

### 1. 🤖 Offline WASM Machine Learning Triage
- **Zero Server Latency:** Runs a 377-feature ONNX classification model directly inside the browser using WebAssembly (`ort-wasm-simd-threaded.wasm`).
- **Computer Vision Rash Scanner:** Mobile camera intake scanning powered by a 28-layer CNN for early detection of Dengue rash, Measles, Chickenpox, and Cholera dehydration signs.

### 2. 🚨 1-Tap Emergency SMS Gateway & Pincode GIS Hospital Solver
- **Pincode Solver:** Decodes manual PIN codes (e.g. `700157`, `742137`, `712101`, `700073`) or device GPS to find the nearest hospital using the Haversine spherical distance formula across 300+ West Bengal medical colleges and BPHCs.
- **Pre-Written Emergency Message Generator:** Automatically generates a comprehensive emergency alert text containing:
  - Patient Name, Age, Gender
  - PIN Code & Location
  - Live Vitals (SpO2 %, Temp °F, Pulse, BP)
  - Primary AI Diagnosis & RED Risk Level
- **1-Tap Cellular Dispatch (`sms:phone?body=encodedMessage`):** Launches the device's native Messages app pre-populated with the exact hospital phone number and pre-written message body ready to send in **1 TAP**.
- **Fast2SMS Cloud Gateway Integration:** Dual-mode dispatch via Fast2SMS Cloud API when online.

### 3. 🛡️ Chief Medical Officer Outbreak Command & Stateful Bed Reservations
- **Live Hospital Bed Capacity:** Displays real-time bed availability for facilities (SSKM Hospital, KPC Medical College, Kolkata Medical College, etc.).
- **Interactive Bed Reservation Engine:** Clicking *"Reserve Emergency ICU Bed"* instantly decrements available bed and ICU counters on screen (e.g., `36` $\rightarrow$ `35`, ICU `5` $\rightarrow$ `4`) and persists state in `localStorage` & IndexedDB across reloads.
- **Health Advisory Alert Pop-Up:** CMOH officers publish urgent field directives. Upon ASHA worker login, a glassmorphic modal pops up requiring mandatory protocol acknowledgment.

### 4. 💾 Store-and-Forward Offline Sync Engine (Dexie IndexedDB + Supabase)
- Patient records taken in zero-connectivity rural zones are saved locally in Dexie IndexedDB (`syncStatus = 0`).
- When network connection is restored, clicking **Pending Sync** uploads the records to Supabase PostgreSQL Cloud and updates local sync status to `1`, zeroing the pending badge cleanly.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite 6, TypeScript |
| **Styling & Aesthetics** | Dark Glassmorphism, TailwindCSS, Lucide Icons, Outfit Font |
| **Edge AI & Machine Learning** | ONNX Runtime WebAssembly (WASM), 28-CNN Vision Model |
| **Voice & Speech Recognition** | Sarvam AI (15 Regional Indian Dialects), Deepgram WebSockets |
| **GIS & Geocoding** | Leaflet, OpenStreetMap, Nominatim Geocoder, Haversine Engine |
| **Database & Offline Storage** | Dexie.js (IndexedDB), Supabase Cloud PostgreSQL & PostGIS |
| **Telephony & Messaging** | Fast2SMS Cloud API, Native `sms:` URI Protocol |

---

## 📱 4-Page Hackathon Application Architecture

1. 🤖 **AI Prediction Engine (`FIELD_TRIAGE`):** 377-feature ONNX inference, voice STT, 28-CNN rash scanner, offline patient intake form.
2. 🚨 **Emergency SMS Gateway (`SMS_GATEWAY`):** 1-Tap Emergency SMS dispatch, PIN code GIS hospital solver, pre-written emergency text generator.
3. 📊 **Cluster Analysis (`CLUSTER_ANALYSIS`):** DBSCAN spatial epidemic clustering, hotspot maps, SIR contagion curves.
4. 🛡️ **Officer Command (`OFFICER_COMMAND`):** Outbreak cluster selection, live hospital bed capacity solver, real-time bed reservation engine, CMOH advisory broadcast center.

---

## 🔑 Authentication Credentials

The app includes built-in role-based JWT authentication with domain enforcement:

### 🟢 Helper Access (ASHA Field Portal)
- **Domain Rule:** Must end with `@helper.com`
- **Default Email:** `sunita.helper@helper.com`
- **Default Password:** `sunita123`

### 🔵 Officer Access (Chief Medical Officer Command)
- **Domain Rule:** Must end with `@gov.com`
- **Default Email:** `officer.kolkata@gov.com`
- **Default Password:** `kolkata123`

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js (v18.x or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/healthtrack-ai.git
   cd healthtrack-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (`.env`):**
   Create or verify your `.env` file with the following keys:
   ```env
   VITE_SARVAM_API_KEY="your-sarvam-api-key"
   VITE_DEEPGRAM_API_KEY="your-deepgram-api-key"
   FAST2SMS_API_KEY="your-fast2sms-api-key"
   VITE_OPENROUTE_API_KEY="your-openroute-api-key"
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3000](http://localhost:3000)** in your browser!

5. **Build Production Bundle:**
   ```bash
   npm run build
   ```

---

## 🗄️ Supabase Cloud Database Setup

To enable real-time cloud data sync, run this SQL script in your Supabase **SQL Editor**:

```sql
CREATE TABLE IF NOT EXISTS public.patient_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    age INT NOT NULL,
    gender TEXT NOT NULL,
    village_name TEXT NOT NULL,
    vitals JSONB,
    symptoms JSONB,
    risk_level TEXT NOT NULL,
    risk_score FLOAT NOT NULL,
    primary_diagnosis TEXT,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert and read on patient_records" 
ON public.patient_records FOR ALL USING (true) WITH CHECK (true);
```

---

## 🐳 Dockerization & Production Deployment

### 1. Docker Build & Run (Single Container)

Build and run the production-optimized Nginx image locally:

```bash
# Build the Docker Image
docker build -t healthtrack-ai .

# Run container on Port 8080
docker run -d -p 8080:80 --name healthtrack-app healthtrack-ai
```
Open **`http://localhost:8080`** in your browser!

---

### 2. Docker Compose (1-Command Launch)

Launch via Docker Compose:

```bash
docker compose up -d
```

To stop:
```bash
docker compose down
```

---

### 3. Deploy to Free Cloud Hosting Platforms

#### A. Deploy to Vercel / Render / Netlify
1. Push your repository to GitHub.
2. Connect repository to [Vercel](https://vercel.com) or [Render](https://render.com).
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`

#### B. Deploy Docker Container to Railway / AWS ECS / DigitalOcean App Platform
1. Connect GitHub repo to Railway / DigitalOcean / AWS.
2. Select **Dockerfile** as deployment type.
3. Expose Port `80`.

---

## 🏆 Hackathon Value Proposition

- **Impact:** Solves rural healthcare delays for 1.4 billion people by connecting offline field workers directly with district hospital ICUs.
- **Feasibility:** Fully functional working software with WASM edge models, GIS routing, and 1-tap cellular messaging that operates without internet.
- **User Experience:** Dark glassmorphic interface, voice input in regional Indian dialects, and clear single-tap emergency workflows.

---

*Crafted with ❤️ for Indian Rural Healthcare & Hackathons.*

