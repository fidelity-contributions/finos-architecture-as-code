# CALM ADR Creation Guide

## Critical Requirements

🚨 **ALWAYS call the ADR creation tool before creating any ADRs**

## Official JSON Schema Definition

The ADR schema from the CALM specification (`adr.json`):

```json
{
    "type": "object",
    "properties": {
        "unique-id": { "type": "string" },
        "slug": { "type": "string", "pattern": "^[a-zA-Z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$" },
        "title": { "type": "string" },
        "status": { "enum": ["draft", "proposed", "accepted", "superseded", "rejected", "deprecated"] },
        "decision-date": { "type": "string", "format": "date" },
        "requesters": { "type": "array", "items": { "type": "string" } },
        "approvers": { "type": "array", "items": { "type": "string" } },
        "context-and-problem-statement": { "type": "string" },
        "decision-drivers": { "type": "array", "items": { "type": "string" } },
        "considered-options": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": { "type": "string" },
                    "description": { "type": "string" },
                    "positive-consequences": { "type": "array", "items": { "type": "string" } },
                    "negative-consequences": { "type": "array", "items": { "type": "string" } }
                },
                "required": ["name", "description"]
            }
        },
        "decision-outcome": {
            "type": "object",
            "properties": {
                "chosen-option": { "type": "string" },
                "rationale": { "type": "string" }
            },
            "required": ["chosen-option", "rationale"]
        },
        "links": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "rel": { "type": "string" },
                    "href": { "type": "string" }
                },
                "required": ["rel", "href"]
            }
        }
    },
    "required": ["title", "status", "context-and-problem-statement"]
}
```

## Overview

An Architecture Decision Record (ADR) records one architecture decision: the context, the options that were considered, and the option that was chosen. CALM Hub stores ADRs per namespace, addressed by a human-readable slug.

## Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Short name for the decision |
| `status` | Yes | Lifecycle state (see below) |
| `context-and-problem-statement` | Yes | What prompted this decision |
| `decision-drivers` | No | Factors that influenced the decision |
| `considered-options` | No | Options evaluated, each with name, description, and consequences |
| `decision-outcome` | No | The chosen option and rationale |
| `links` | No | Related resources (`rel` + `href`) |
| `unique-id` | No | Local identifier; CALM Hub ignores it and addresses ADRs by slug |
| `slug` | No | Immutable identifier assigned by CALM Hub on create |
| `decision-date` | No | ISO date (`YYYY-MM-DD`); typically set when the ADR is accepted |
| `requesters` | No | People who requested the decision |
| `approvers` | No | People who approved the decision |

## Status Lifecycle

```
draft → proposed → accepted
                 → rejected
                 → superseded (by a later ADR)
                 → deprecated
```

- Start every ADR as `draft`
- Move to `proposed` when ready for review
- `decision-date` is typically set when the status moves to `accepted`
- An accepted ADR can later be `superseded` or `deprecated`

## chosen-option Rule

`decision-outcome.chosen-option` MUST match the `name` of one entry in `considered-options`. A Spectral rule validates this — validation fails if the name does not match.

## CURIE References

ADRs stored in CALM Hub are referenced using CURIEs (Compact URIs):

```
{namespace}:adrs:{slug}@{revision}
```

| Format | Example |
|--------|---------|
| CURIE | `finos:adrs:use-oauth2@3` |
| Canonical URL | `https://hub.calm.finos.org/calm/namespaces/finos/adrs/use-oauth2/versions/3` |

CALM Hub assigns the slug from the title on first create. Revisions are integers assigned by the Hub.

## Referencing ADRs in Controls

Use the `adrs` array on a control requirement to justify a compliance decision. A control with `status: "non-compliant"` MUST have at least one ADR reference:

```json
"controls": {
    "encryption-at-rest": {
        "description": "Data encryption requirements for storage tier",
        "requirements": [
            {
                "requirement-url": "https://requirements.company.com/encryption.json",
                "status": "non-compliant",
                "adrs": ["finos:adrs:skip-encryption-cold-storage@1"]
            }
        ]
    }
}
```

See **control-creation.md** for the full control-detail schema with `status` and `adrs`.

## CLI Commands

| Command | Description |
|---------|-------------|
| `calm validate --adr <file>` | Validate an ADR against the schema its `$schema` names |
| `calm hub list adrs --namespace <ns>` | List ADRs in a namespace |
| `calm hub pull adr -m <slug> --namespace <ns>` | Fetch an ADR by slug |
| `calm hub push adr <file> --namespace <ns>` | Push an ADR to CALM Hub |

See **calm-cli-instructions.md** for full CLI reference.

## Complete Example

An ADR for choosing OAuth2 as the API authentication mechanism:

```json
{
    "$schema": "https://calm.finos.org/release/1.3/meta/adr.json",
    "title": "Use OAuth2 for API Authentication",
    "status": "accepted",
    "decision-date": "2026-03-15",
    "requesters": ["Security Team"],
    "approvers": ["Architecture Board"],
    "context-and-problem-statement": "The trading platform exposes public APIs that third-party clients consume. We need a standard authentication mechanism that supports delegated access, token expiry, and scope-based authorization without sharing user credentials.",
    "decision-drivers": [
        "Must support delegated access for third-party clients",
        "Token-based to avoid credential sharing",
        "Industry standard with broad library support",
        "Must integrate with existing identity provider"
    ],
    "considered-options": [
        {
            "name": "OAuth2 with OIDC",
            "description": "OAuth 2.0 authorization framework with OpenID Connect for identity",
            "positive-consequences": [
                "Industry standard with broad adoption",
                "Supports delegated access and scopes",
                "Token expiry and refresh built in",
                "Integrates with existing Keycloak instance"
            ],
            "negative-consequences": [
                "Added complexity of token management",
                "Requires OIDC provider infrastructure"
            ]
        },
        {
            "name": "API keys",
            "description": "Static API keys issued per client",
            "positive-consequences": [
                "Simple to implement",
                "No external infrastructure needed"
            ],
            "negative-consequences": [
                "No built-in expiry or rotation",
                "No delegated access or scopes",
                "Key leakage is harder to detect"
            ]
        },
        {
            "name": "Mutual TLS",
            "description": "Client certificate authentication at the transport layer",
            "positive-consequences": [
                "Strong authentication",
                "No shared secrets"
            ],
            "negative-consequences": [
                "Complex certificate management for third parties",
                "Does not support delegated access"
            ]
        }
    ],
    "decision-outcome": {
        "chosen-option": "OAuth2 with OIDC",
        "rationale": "OAuth2 with OIDC provides delegated access, token lifecycle management, and scope-based authorization. It integrates with our existing Keycloak instance and is the industry standard for public API authentication."
    },
    "links": [
        {
            "rel": "justifies",
            "href": "https://hub.calm.finos.org/calm/namespaces/finos/adrs/use-oauth2/versions/1"
        }
    ]
}
```

## ADR Creation Checklist

- [ ] Include `$schema` reference to `adr.json`
- [ ] Provide a descriptive `title`
- [ ] Set `status` (start with `draft`)
- [ ] Write a clear `context-and-problem-statement`
- [ ] List at least two `considered-options` with names and descriptions
- [ ] Set `decision-outcome.chosen-option` to match an option name exactly
- [ ] Provide a `rationale` explaining why the option was chosen
**🚨 MANDATORY VALIDATION (Do not skip):**
- [ ] **Run CALM validation:** `calm validate --adr <filename>.json`
- [ ] **Verify chosen-option matches** a considered-options name exactly
- [ ] **Fix ALL errors before proceeding**

> **Note:** See **calm-cli-instructions.md** for complete CLI usage and **control-creation.md** for referencing ADRs in controls.

## Cross-References

- **Control Creation**: How to reference ADRs in non-compliant controls
- **Architecture Creation**: Top-level `adrs` array for architecture-wide decisions
- **CLI Instructions**: `validate --adr`, `hub list/pull/push adrs` commands
