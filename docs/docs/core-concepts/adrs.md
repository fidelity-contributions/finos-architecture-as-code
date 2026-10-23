---
id: adrs
title: Architecture Decision Records
sidebar_position: 12
---

# Architecture Decision Records (ADRs) in CALM

An Architecture Decision Record (ADR) records one architecture decision: the context, the options that were considered, and the option that was chosen. CALM Hub stores ADRs per namespace, and a CALM document refers to them by URL or CURIE.

:::info Schema Version
The `adr.json` meta-schema and the control compliance `status` and `adrs` properties are a **draft**. They need the upcoming CALM schema release. Until it ships, see the draft in [`calm/draft/adr-support`](https://github.com/finos/architecture-as-code/tree/main/calm/draft/adr-support).
:::

## The ADR format

An ADR file uses the CALM `adr.json` format:

```json
{
  "$schema": "https://calm.finos.org/draft/adr-support/meta/adr.json",
  "slug": "accept-plain-http-for-legacy-ledger",
  "title": "Accept plain HTTP for the legacy ledger link",
  "status": "accepted",
  "context-and-problem-statement": "The legacy ledger does not support TLS.",
  "considered-options": [
    { "name": "Accept plain HTTP until replacement", "description": "Record a temporary deviation." },
    { "name": "Add a TLS-terminating sidecar", "description": "Put a proxy in front of the ledger." }
  ],
  "decision-outcome": {
    "chosen-option": "Accept plain HTTP until replacement",
    "rationale": "The risk is low inside the isolated segment."
  }
}
```

- `title`, `status` and `context-and-problem-statement` are required. `status` is one of `draft`, `proposed`, `accepted`, `superseded`, `rejected` or `deprecated`.
- `decision-outcome.chosen-option` is the `name` of an entry in `considered-options`. `calm validate --adr` checks this.
- `slug` is the identity of the ADR in CALM Hub. CALM Hub assigns it on create, from `slug` or else from `title`, and it does not change.
- To point an ADR back to the control that it justifies, use a link with `"rel": "justifies"`. This is a convention. Tools do not enforce it.

## Referencing an ADR

CALM Hub gives each ADR revision a canonical URL, and a CURIE that expands to it:

| Form | Example |
|------|---------|
| Canonical URL | `https://calm-hub.example.com/calm/namespaces/finos/adrs/use-oauth2/versions/2` |
| CURIE | `finos:adrs:use-oauth2@2` |

CALM Hub assigns revisions (`1`, `2`, ...). They are not semantic versions.

You can put ADR references in these places:

| Where | Use |
|-------|-----|
| Architecture `adrs` | Decisions about the whole architecture |
| Control requirement `adrs` | The decision that justifies how a control is met, or why it is not met. See [Controls](controls.md#compliance-status) |

## Working with ADRs

- `calm validate --adr <file>` validates an ADR. See [the CLI](../working-with-calm/cli.md#example-of-adr-validation).
- `calm hub list adrs`, `calm hub pull adr` and `calm hub push adr` read and write ADRs in CALM Hub. See [Managing ADRs](../working-with-calm/cli.md#managing-adrs).
- `calm workspace push` pushes the ADRs in a workspace. CALM Hub assigns their revisions.

For a complete example, see the prototypes in [`calm/draft/adr-support/prototype`](https://github.com/finos/architecture-as-code/tree/main/calm/draft/adr-support/prototype): an architecture with control ADR references, and the ADR that justifies its non-compliant control.
