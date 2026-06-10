# Security Policy

## Responsible Use

CyberKit is a defensive and educational cybersecurity toolkit. Use it only on systems you own, administer, or have explicit permission to test. The learning labs are local simulations and must not be used as instructions to attack third-party systems.

Scanner routes include safeguards against private, loopback, link-local, multicast, and metadata targets. Do not attempt to bypass those controls.

## Reporting Vulnerabilities

Please report suspected vulnerabilities privately before public disclosure.

Include:

- A clear description of the issue and affected route, component, or utility.
- Steps to reproduce with minimal input.
- Impact, including whether data exposure, SSRF, XSS, auth bypass, or denial of service is possible.
- Suggested remediation, if known.

Do not include secrets, personal data, or exploit traffic against systems you do not control.

## Disclosure Process

Maintainers should acknowledge a valid report within 7 days, provide a remediation plan or status update within 30 days, and coordinate public disclosure after a fix is available. Critical issues that affect user data or server-side request safety should be prioritized for immediate patching.
