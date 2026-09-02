# Security

KuMeet.ai is an academic prototype and has not received a production security
review. Do not use it with confidential meeting data without completing your
own threat model, access-control review, retention policy, and deployment
hardening.

## Credentials

- Never commit API tokens, Firebase Admin service-account files, SSH private
  keys, populated environment files, database snapshots, or meeting media.
- Use a secret manager in production and read-only runtime mounts for local
  container development.
- Firebase web configuration is delivered to browsers by design. Protect the
  associated project with appropriate Firebase Authentication and security
  rules; never expose Firebase Admin credentials.
- Treat every credential that has appeared in a commit, archive, shared ZIP,
  chat, or screenshot as compromised. Revoke or rotate it at the provider.

## Reporting a vulnerability

Prefer the repository's private vulnerability-reporting feature when it is
enabled. Otherwise contact the maintainers privately. Do not include active
credentials, private meeting data, or exploit details in a public issue.
