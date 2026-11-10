# CALM Architecture Creation Guide

## Overview

This guide provides instructions for creating complete CALM architecture documents that comply with the FINOS CALM v1.3 schema.

## Required Schema Structure

Every CALM architecture MUST include:

```json
{
    "$schema": "https://calm.finos.org/release/1.3/meta/calm.json",
    "unique-id": "string",
    "name": "string",
    "description": "string"
}
```

## Optional Top-Level Properties

```json
{
    "metadata": [],
    "nodes": [],
    "relationships": [],
    "flows": [],
    "controls": {},
    "adrs": ["finos:adrs:use-oauth2@3", "finos:adrs:adopt-grpc@1"]
}
```

Top-level `adrs` references architecture-wide decisions. Use CURIEs (`{namespace}:adrs:{slug}@{revision}`) or canonical URLs. See **adr-creation.md** for ADR authoring.

## CURIE References

CALM Hub resources can be referenced using CURIEs (Compact URIs) instead of full URLs:

```
{namespace}:{type}:{name}@{version}
```

Examples:
- `finos:architectures:trading-system@1.0.0`
- `finos:patterns:api-gateway@2.0.0`
- `finos:adrs:use-oauth2@3`

CURIEs are resolved by `calm validate` when `--calm-hub-url` or `--assets-path` is set.

## Architecture Creation Checklist

- [ ] Include required $schema reference to CALM v1.3
- [ ] Provide unique-id (kebab-case recommended)
- [ ] Add descriptive name and description
- [ ] Name file with `.architecture.json` suffix
- [ ] Add nodes array (even if empty initially)
- [ ] Add relationships array to connect nodes
- [ ] Include metadata array for operational info
**🚨 MANDATORY VALIDATION (Do not skip):**
- [ ] **Verify calm-cli is installed:** `which calm`
- [ ] **Run CALM validation:** `calm validate -a <filename>.architecture.json`
- [ ] **Review output for errors:** `jsonSchemaValidationOutputs`, `spectralSchemaValidationOutputs`
- [ ] **Fix ALL errors before proceeding** - Do not assume JSON validity equals CALM validity
- [ ] **Confirm output shows:** `"hasErrors": false, "hasWarnings": false`
- [ ] **Document any warnings addressed**

> **Note:** See **calm-cli-instructions.md** for complete CLI usage, validation modes, and options.

## Best Practices

1. **Naming**: Use descriptive, business-friendly names
2. **IDs**: Use kebab-case for unique-id values
3. **File Naming**: Architecture files should be suffixed with `.architecture.json` (e.g., `trading-system.architecture.json`)
4. **Modularity**: Consider using detailed-architecture for complex subsystems
5. **Validation**: Always validate before committing changes
6. **Documentation**: Include comprehensive descriptions

## Example Minimal Architecture

```json
{
    "$schema": "https://calm.finos.org/release/1.3/meta/calm.json",
    "unique-id": "example-trading-system",
    "name": "Example Trading System",
    "description": "A simple trading system architecture",
    "metadata": [
        {
            "version": "1.0.0",
            "created-by": "Architecture Team",
            "environment": "production"
        }
    ],
    "nodes": [],
    "relationships": []
}
```
