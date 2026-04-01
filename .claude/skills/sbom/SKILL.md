# SBOM Generator

Generate a Software Bill of Materials with vulnerability and license analysis.

## Trigger phrases
- /sbom
- "generate a software bill of materials"
- "what dependencies do we have"
- "supply chain risk assessment"

## What to do

1. Detect the project type and read dependency files:
   - Node.js: `package.json`, `package-lock.json`
   - Python: `requirements.txt`, `Pipfile.lock`, `pyproject.toml`
   - Go: `go.mod`, `go.sum`
   - Rust: `Cargo.toml`, `Cargo.lock`
   - Java: `pom.xml`, `build.gradle`
   - If multiple: scan all

2. For each dependency, extract:
   - Package name and version
   - License (SPDX identifier)
   - Whether it's direct or transitive
   - Whether it's production or dev-only

3. Flag known vulnerabilities by searching via allowed web domains:
   - CVE ID, severity (CVSS score), affected versions
   - Whether a patched version exists
   - Mark: Fix available / No fix / Won't fix

4. Identify license conflicts:
   - Copyleft in proprietary project (GPL in MIT project)
   - Missing license declarations
   - License incompatibilities between dependencies

5. Generate output in requested format:
   - **Summary** (default): table with name, version, license, vulns
   - **CycloneDX**: JSON conforming to CycloneDX 1.5 spec
   - **SPDX**: JSON conforming to SPDX 2.3 spec

6. Executive summary:
   - Total dependencies (direct + transitive, prod + dev)
   - Vulnerability counts by severity
   - License distribution
   - Supply chain risk score: Low / Medium / High / Critical
   - Top 3 recommended actions

## Do NOT
- Include dev dependencies in production risk scores
- Skip transitive dependencies — they are the main attack surface
- Generate SBOM without checking for known vulns
