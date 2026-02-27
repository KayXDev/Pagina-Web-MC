# Security Policy

## Supported Versions

This project is actively maintained on the `main` branch.

- ✅ Supported: the latest deployment and `main`
- ❌ Unsupported: older deployments/commits

## Reporting a Vulnerability

If you believe you have found a security vulnerability, please report it **privately**.

**Preferred contact**

- Email: use `SECURITY_EMAIL` if configured; otherwise use `ADMIN_EMAIL`

**Alternative (GitHub)**
- If you can’t email, open a **private** GitHub Security Advisory (if enabled for this repo).

### What to include

Please include as much of the following as possible:

- A clear description of the issue and its impact
- Steps to reproduce (proof-of-concept if possible)
- Affected URLs/routes/components
- Environment details (browser, OS, account type, etc.)
- Any relevant logs or screenshots (avoid sending sensitive personal data)

### Response timeline

We aim to:

- Acknowledge receipt within **72 hours**
- Provide an initial assessment within **7 days**
- Provide a fix or mitigation timeline as soon as the issue is confirmed

Timelines may vary depending on severity and complexity.

## Disclosure Guidelines

Please do **not** publicly disclose the vulnerability until we have had a reasonable chance to investigate and release a fix.

We appreciate coordinated disclosure.

## Scope

### In scope

- Vulnerabilities in the web application and API routes
- Authentication and authorization issues
- Injection issues (NoSQL/SQL/command), XSS, CSRF
- Sensitive data exposure
- Broken access control in the admin panel
- Newsletter, cron routes, and email flows (subscription/unsubscribe tokens)

### Out of scope

- Social engineering, spam, or physical attacks
- Denial of service (DoS) via traffic flooding
- Issues in third-party services/providers (Vercel, MongoDB Atlas, SMTP provider) unless caused by our configuration or code
- Reports that only show outdated browsers/unsupported configurations

## Safe Harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and service disruption
- Only access data necessary to demonstrate the issue
- Report the issue promptly and keep it confidential until fixed

## Security Best Practices (for maintainers)

- Keep dependencies updated and run `npm audit` / `npm outdated`
- Rotate secrets if a leak is suspected (`NEXTAUTH_SECRET`, SMTP creds, `CRON_SECRET`)
- Use least-privilege credentials for third-party services

---

## Política de seguridad (ES)

Si encuentras una vulnerabilidad, repórtala **en privado**:

- Email: usa `SECURITY_EMAIL` si lo configuras; si no, usa `ADMIN_EMAIL`

Incluye:

- Descripción e impacto
- Pasos para reproducir
- Rutas/URLs afectadas
- Pruebas (PoC) si es posible

Nos comprometemos a:

- Confirmar recepción en **72h**
- Primera evaluación en **7 días**

Por favor, no publiques la vulnerabilidad hasta que exista un parche o mitigación.