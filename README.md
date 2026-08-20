# Nexus SOC

Nexus SOC is a web-based intelligence engine and workspace designed for Security Operations Center (SOC) analysts. It centralizes log analysis, threat intelligence enrichment, and automated reporting into a single frontend dashboard.

## Features

- **Analyst Workspace**: A centralized note-taking interface for storing raw logs, alerts, and investigative data.
- **Log Parsing & Chronology**: Automatically parses raw JSON logs (e.g., from Wazuh or Elasticsearch), extracts source and destination IPs, and generates a structured chronological timeline.
- **Automated IOC Enrichment**: Integrates with the AbuseIPDB v2 API to batch-process extracted IPv4 addresses, returning ASN, country codes, and abuse confidence scores.
- **Automated Threat Analysis**: Analyzes log patterns to generate a 5W1H knowledge matrix and provides actionable, step-by-step remediation tactics.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nexus-soc-ui.git
   cd nexus-soc-ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Configuration

Nexus SOC requires third-party API integrations for full functionality. Configure your API keys via the **Configuration > API Config** menu in the application interface.

- **AbuseIPDB**: Requires a valid v2 API key for IOC enrichment.
- **AI Engine**: Requires a valid LLM provider API key for automated threat analysis.

API keys are maintained in the local application state and are not persisted to a backend database. The application utilizes a local Vite proxy to handle CORS restrictions when communicating with external APIs.

## Tech Stack

- React 18
- Vite
- Tailwind CSS

## License

MIT License
