import { describe, it, expect } from 'vitest';
import { adrContentEqual, adrMetaToAdrDocument, fromAdrDocument, toAdrDocument } from './adr';
import type { CalmAdrDocumentSchema, CalmAdrSchema } from '@finos/calm-models/types';

const fullDocument: CalmAdrDocumentSchema = {
    slug: 'use-oauth2',
    title: 'Use OAuth2',
    status: 'accepted',
    'decision-date': '2026-10-01',
    requesters: ['payments-team'],
    approvers: ['arb'],
    'context-and-problem-statement': 'We need delegated authorisation.',
    'decision-drivers': ['Security'],
    'considered-options': [
        {
            name: 'OAuth2',
            description: 'Use OAuth2.',
            'positive-consequences': ['Standard'],
            'negative-consequences': ['Complex'],
        },
        { name: 'API keys', description: 'Use static keys.' },
    ],
    'decision-outcome': { 'chosen-option': 'OAuth2', rationale: 'Industry standard.' },
    links: [{ rel: 'justifies', href: 'arch.json#node/control' }],
};

const hubAdr: CalmAdrSchema = {
    title: 'Use OAuth2',
    status: 'accepted',
    creationDateTime: '2026-10-01T10:00:00Z',
    updateDateTime: '2026-10-02T10:00:00Z',
    decisionDate: '2026-10-01',
    requesters: ['payments-team'],
    approvers: ['arb'],
    contextAndProblemStatement: 'We need delegated authorisation.',
    decisionDrivers: ['Security'],
    consideredOptions: [
        { name: 'OAuth2', description: 'Use OAuth2.', positiveConsequences: ['Standard'], negativeConsequences: ['Complex'] },
        { name: 'API keys', description: 'Use static keys.', positiveConsequences: [], negativeConsequences: [] },
    ],
    decisionOutcome: {
        chosenOption: { name: 'OAuth2', description: 'Use OAuth2.', positiveConsequences: ['Standard'], negativeConsequences: ['Complex'] },
        rationale: 'Industry standard.',
    },
    links: [{ rel: 'justifies', href: 'arch.json#node/control' }],
};

describe('ADR kebab-case <-> camelCase adapter', () => {
    it('converts a Hub ADR to adr.json format, dropping timestamps and naming the chosen option', () => {
        const document = toAdrDocument(hubAdr, 'use-oauth2');

        expect(document).toEqual(fullDocument);
        expect(document).not.toHaveProperty('creationDateTime');
        expect(document).not.toHaveProperty('updateDateTime');
    });

    it('converts an adr.json document to the Hub model, copying the chosen option from considered-options', () => {
        const adr = fromAdrDocument(fullDocument);

        expect(adr.decisionOutcome?.chosenOption).toEqual(hubAdr.consideredOptions[0]);
        expect(adr.contextAndProblemStatement).toBe(hubAdr.contextAndProblemStatement);
    });

    it('round-trips file -> Hub -> file without loss', () => {
        expect(toAdrDocument(fromAdrDocument(fullDocument), fullDocument.slug)).toEqual(fullDocument);
    });

    it('round-trips Hub -> file -> Hub without loss except the server timestamps', () => {
        const { creationDateTime: _created, updateDateTime: _updated, ...content } = hubAdr;
        expect(fromAdrDocument(toAdrDocument(hubAdr))).toEqual(content);
    });

    it('round-trips a minimal document, keeping absent optional fields absent', () => {
        const minimal: CalmAdrDocumentSchema = {
            title: 'Minimal',
            status: 'draft',
            'context-and-problem-statement': 'Context',
        };

        const adr = fromAdrDocument(minimal);

        expect(adr).toEqual({
            title: 'Minimal',
            status: 'draft',
            contextAndProblemStatement: 'Context',
            decisionDrivers: [],
            consideredOptions: [],
            links: [],
        });
        expect(toAdrDocument(adr)).toEqual(minimal);
    });

    it('handles a Hub ADR with null-ish optional fields', () => {
        const sparse = {
            title: 'Sparse',
            status: 'draft',
            contextAndProblemStatement: 'Context',
            decisionDrivers: null,
            consideredOptions: null,
            decisionOutcome: null,
            links: null,
        } as unknown as CalmAdrSchema;

        expect(toAdrDocument(sparse)).toEqual({ title: 'Sparse', status: 'draft', 'context-and-problem-statement': 'Context' });
    });

    it('emits the chosen option name even when it is not a considered option', () => {
        const dangling: CalmAdrSchema = {
            ...hubAdr,
            decisionOutcome: { ...hubAdr.decisionOutcome, chosenOption: { ...hubAdr.consideredOptions[0], name: 'Removed option' } },
        };

        expect(toAdrDocument(dangling)['decision-outcome']?.['chosen-option']).toBe('Removed option');
    });

    it('rejects a chosen-option that names no considered option', () => {
        const dangling: CalmAdrDocumentSchema = {
            ...fullDocument,
            'decision-outcome': { 'chosen-option': 'mTLS', rationale: 'Because.' },
        };

        expect(() => fromAdrDocument(dangling)).toThrow(/chosen-option 'mTLS' does not match the name of any considered-options entry/);
    });

    it('rejects a chosen-option when there are no considered options', () => {
        const { 'considered-options': _options, ...withoutOptions } = fullDocument;

        expect(() => fromAdrDocument(withoutOptions)).toThrow(/chosen-option 'OAuth2'/);
    });

    it('converts a Hub ADR envelope with its slug', () => {
        const document = adrMetaToAdrDocument({ namespace: 'finos', id: 1, slug: 'use-oauth2', revision: 2, adr: hubAdr });

        expect(document.slug).toBe('use-oauth2');
        expect(document.title).toBe('Use OAuth2');
    });
});

describe('adrContentEqual', () => {
    it('ignores identity fields, key order, null values and empty arrays', () => {
        const local = { $schema: 'https://calm.finos.org/draft/adr-support/meta/adr.json', 'unique-id': 'local', ...fullDocument };
        const remote = {
            links: fullDocument.links,
            ...fullDocument,
            $id: 'https://hub/calm/namespaces/finos/adrs/use-oauth2/versions/3',
            slug: 'use-oauth2',
            requesters: fullDocument.requesters,
            'decision-drivers': fullDocument['decision-drivers'],
            supersedes: null,
            tags: [],
        };

        expect(adrContentEqual(local, remote)).toBe(true);
    });

    it('detects a change in authored content', () => {
        expect(adrContentEqual(fullDocument, { ...fullDocument, status: 'superseded' })).toBe(false);
        expect(adrContentEqual(fullDocument, { ...fullDocument, 'decision-drivers': ['Security', 'Cost'] })).toBe(false);
    });
});
