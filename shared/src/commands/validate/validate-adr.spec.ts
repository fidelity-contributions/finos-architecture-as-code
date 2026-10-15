import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { validateAdr } from './validate-core';
import { SchemaDirectory } from '../../schema-directory';
import { buildBrowserDocumentLoader } from '../../document-loader/browser-document-loader';

const FIXTURES = path.join(__dirname, '../../../test_fixtures/adr');
const adrSchema = JSON.parse(readFileSync(path.join(FIXTURES, 'schema/adr.json'), 'utf-8'));
const validAdr = JSON.parse(readFileSync(path.join(FIXTURES, 'valid-adr.json'), 'utf-8'));

async function schemaDirectory(): Promise<SchemaDirectory> {
    const directory = new SchemaDirectory(buildBrowserDocumentLoader({ documents: { [adrSchema.$id]: adrSchema }, allowRemote: false }));
    await directory.loadSchemas();
    return directory;
}

describe('validateAdr', () => {
    it('accepts a valid ADR', async () => {
        const outcome = await validateAdr(validAdr, adrSchema, await schemaDirectory());

        expect(outcome.hasErrors).toBe(false);
        expect(outcome.hasWarnings).toBe(false);
        expect(outcome.allValidationOutputs()).toEqual([]);
    });

    it('rejects an ADR with no status against the JSON schema', async () => {
        const { status: _status, ...withoutStatus } = validAdr;

        const outcome = await validateAdr(withoutStatus, adrSchema, await schemaDirectory());

        expect(outcome.hasErrors).toBe(true);
        expect(outcome.jsonSchemaValidationOutputs).toEqual([
            expect.objectContaining({ severity: 'error', source: 'adr', message: expect.stringContaining('status') })
        ]);
    });

    it('rejects an ADR whose chosen-option names no considered option with the Spectral ruleset', async () => {
        const dangling = { ...validAdr, 'decision-outcome': { 'chosen-option': 'Rewrite the ledger', rationale: 'r' } };

        const outcome = await validateAdr(dangling, adrSchema, await schemaDirectory());

        expect(outcome.hasErrors).toBe(true);
        expect(outcome.jsonSchemaValidationOutputs).toEqual([]);
        expect(outcome.spectralSchemaValidationOutputs).toEqual([
            expect.objectContaining({
                code: 'adr-chosen-option-must-be-a-considered-option',
                path: '/decision-outcome/chosen-option',
                source: 'adr'
            })
        ]);
    });
});
