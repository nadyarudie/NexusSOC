# Nexus SOC Intelligence Engine

![Nexus SOC](https://img.shields.io/badge/Status-Active-success) ![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC)

**Nexus SOC** is a personal toolkit and unified dashboard designed specifically for Security Operations Center (SOC) analysts. 

## 💡 Why I Built This?
Working as a SOC Analyst often means dealing with "tool fatigue" or "swivel-chair analysis." We rely heavily on various powerful open-source tools (like Wazuh, ELK, etc.), but because they aren't seamlessly integrated out-of-the-box, analysts end up constantly jumping between multiple browser tabs. 

You copy logs from Wazuh, paste IPs into AbuseIPDB, switch to a notepad to draft your analysis, and then use another tool to format the final report. 

I built this personal project to bridge that integration gap. Nexus SOC serves as a **single pane of glass** workspace to streamline incident response workflows—automating mundane tasks like IOC extraction, log structuring, and report generation so analysts can focus on actual threat hunting.

---

## ✨ Key Features

### 1. Analyst Workspace (Notes)
A centralized place to dump raw logs, alerts, and findings during an active investigation. These notes act as the single source of truth for the automated tools in this platform.

### 2. Log Chronology Generator
Throw unstructured, messy, or multi-line JSON logs (e.g., from Wazuh or Elasticsearch) into a note, and this engine will automatically:
- Parse timestamps and convert them to local time (WIB).
- Extract Attacker IPs and Destination IPs.
- Organize everything into a clean, easy-to-read chronological timeline.

### 3. Automated IOC Enrichment
No more manual IP reputation lookups. 
- Automatically extracts all unique IPv4 addresses from your raw investigation notes.
- Direct integration with **AbuseIPDB v2 API** to fetch ASN, Country, and Abuse Confidence Scores in one click.
- Filters out local/internal IPs automatically to save API quotas.

### 4. AI-Driven Threat Analysis
Leverages AI to read through your logs and automatically generate a structured incident report.
- **Knowledge Base (5W + 1H):** Automatically deduces the *What, Who, Where, When, Why,* and *How* of an attack.
- **Actionable Report:** Generates an Executive Summary and specific, step-by-step remediation tactics (e.g., firewall blocklists, patching).

### 5. Minimalist, Apple-Inspired UI
Designed to be clean, distraction-free, and easy on the eyes during long shifts. No unnecessary clutter—just the data you need.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- An AbuseIPDB API Key (for IOC Enrichment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/nexus-soc-ui.git
   cd nexus-soc-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

---

## ⚙️ Configuration
You can configure your API keys directly from the UI via the **Configuration > API Config** sidebar menu. 
The application uses a local Vite proxy to bypass CORS restrictions when making requests to third-party services like AbuseIPDB. 

*Note: API keys configured in the UI are currently kept in the application state and are not persisted to a backend database, keeping your credentials secure and local.*

---

## 🛠️ Built With
- **[React](https://reactjs.org/)** - UI Framework
- **[Vite](https://vitejs.dev/)** - Frontend Tooling & Proxy
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[FontAwesome](https://fontawesome.com/)** - Iconography

---

## 📄 License
This project is for personal and educational purposes. Feel free to fork and adapt it to your own SOC environment!
