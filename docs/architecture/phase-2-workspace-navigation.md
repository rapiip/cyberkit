# Phase 2: Workspace Navigation

## Product Model

CyberKit exposes 11 primary workspaces:

| Maturity | Workspace |
| --- | --- |
| Core | Website Security Audit |
| Core | Domain & IP Intelligence |
| Core | JWT Inspector |
| Core | Password Security |
| Core | File Triage & IOC Analysis |
| Core | Secret Scanner |
| Core | CVE / KEV Intelligence |
| Utility | Network Workbench |
| Utility | Data Transformation |
| Utility | CTF Decoder Workbench |
| Utility | Hash & Crypto Workbench |

Security Labs remains an Experimental area outside the operational workspace count.
Secure Generator is a utility group inside Data Transformation. Classical CTF
decoders are utility panels inside CTF Decoder Workbench.

## Entry Points

The homepage starts from seven user goals:

1. Audit a website.
2. Investigate a domain or IP.
3. Analyze a file or log.
4. Find secrets or IOCs.
5. Check CVE and KEV intelligence.
6. Analyze a password or JWT.
7. Decode a payload.

The sidebar exposes the workspace catalog and the highest-priority workflows.
Search and the command palette resolve both workspace names and nested capabilities.

## Route Migration

- `/tools` redirects permanently to `/workspaces`.
- `/tools/compare` redirects permanently to `/workspaces/data-transformation`.
- Every registered `/tools/<slug>` route redirects permanently to its owning
  workspace with `?tool=<tool-id>` so the matching panel opens.
- Canonical and sitemap URLs use `/workspaces/...`; legacy tool URLs are not
  emitted in the sitemap.

Redirects are generated from `legacyRouteMappings` in the workspace registry.
Adding a tool assignment therefore requires updating the registry, not a separate
hand-maintained redirect table.

## Bundling

Homepage, sidebar, command palette, and workspace catalog import metadata only.
Executor modules are dynamically imported by `ToolRunner` after the user runs a
capability. Opening the catalog or switching tabs does not invoke executor loaders.

## Known Limits

- Capability panels still execute the existing mini-tool implementations; this
  phase changes product structure and routing, not the deeper scanner behavior.
- Website Security Audit retains the existing unified `/audit` flow while its
  focused checks remain accessible as workspace panels.
- Loading and error boundaries are route-level. Provider-specific partial states
  remain owned by the existing tool executors.
