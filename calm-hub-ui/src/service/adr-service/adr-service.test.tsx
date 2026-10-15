import { afterEach, describe, expect, it } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';
import { AdrService } from './adr-service.js';
import axios from 'axios';
import fs from 'fs';

const ax = axios.create();
const mock = new AxiosMockAdapter(ax as never);

const namespace = 'test-namespace';
const adrId = '1';
const revision = '1';
const expectedAdr = JSON.parse(fs.readFileSync('./src/fixtures/adr.json', 'utf8'));

const errorStatusCodes = [400, 401, 403, 404, 500];

describe('Adr Service ', () => {
    const adrService = new AdrService(ax);

    afterEach(() => {
        mock.reset();
    });

    it('should retrieve all the ADR summaries for a given namespace', async () => {
        const expectedAdrSummaries = [{ id: 1, title: 'Use CALM', status: 'accepted' }, { id: 2, title: 'Use React', status: 'proposed' }];
        mock.onGet(`/api/calm/namespaces/${namespace}/adrs`).reply(200, {
            values: expectedAdrSummaries,
        });
        const actualAdrSummaries = await adrService.fetchAdrSummaries(namespace);
        expect(actualAdrSummaries).toEqual(expectedAdrSummaries);
    });

    it.each(errorStatusCodes)(
        'should throw an error when backend service returns an unsuccessful status code while retrieving all the ADR summaries',
        async (errorStatusCode) => {
            const errorMessage = `
        {
            "message": "An Error Occurred",
        }`;
            mock.onGet(`/api/calm/namespaces/${namespace}/adrs`).reply(errorStatusCode, errorMessage);
            await expect(async () => await adrService.fetchAdrSummaries(namespace)).rejects.toThrowError();
        }
    );

    it('should retrieve all the revisions for an ADR in a given namespace', async () => {
        const expectedRevisions = [1, 2];
        mock.onGet(`/api/calm/namespaces/${namespace}/adrs/${adrId}/revisions`).reply(200, {
            values: expectedRevisions,
        });
        const actualRevisions = await adrService.fetchAdrRevisions(namespace, adrId);
        expect(actualRevisions).toEqual(expectedRevisions);
    });

    it.each(errorStatusCodes)(
        'should throw an error when backend service returns an unsuccessful status code while retrieving all the revisions for an ADR',
        async (errorStatusCode) => {
            const errorMessage = `
        {
            "message": "An Error Occurred",
        }`;
            mock.onGet(`/api/calm/namespaces/${namespace}/adrs`).reply(errorStatusCode, errorMessage);
            await expect(
                async () => await adrService.fetchAdrRevisions(namespace, adrId)
            ).rejects.toThrowError();
        }
    );

    it('should retrieve an adr revision', async () => {
        mock.onGet(`/api/calm/namespaces/${namespace}/adrs/${adrId}/revisions/${revision}`).reply(
            200,
            expectedAdr
        );
        const actualAdr = await adrService.fetchAdr(namespace, adrId, revision);
        expect(actualAdr).toEqual(expectedAdr);
    });

    it.each(errorStatusCodes)(
        'should throw an error when backend service returns an unsuccessful status code while retrieving a specific revision of an ADR',
        async (errorStatusCode) => {
            const errorMessage = `
        {
            "message": "An Error Occurred",
        }`;
            mock.onGet(`/api/calm/namespaces/${namespace}/adrs/${adrId}/revisions/${revision}`).reply(
                errorStatusCode,
                errorMessage
            );
            await expect(
                async () => await adrService.fetchAdr(namespace, adrId, revision)
            ).rejects.toThrowError();
        }
    );

    describe('slug-based lookups', () => {
        const mappings = { values: [{ customId: 'use-oauth2', numericId: 7 }, { customId: 'use-tls', numericId: 9 }] };

        it('resolves a slug to its numeric id', async () => {
            mock.onGet(`/calm/namespaces/${namespace}/adrs`).reply(200, mappings);
            await expect(adrService.fetchAdrIdForSlug(namespace, 'use-tls')).resolves.toBe(9);
        });

        it('rejects an unknown slug', async () => {
            mock.onGet(`/calm/namespaces/${namespace}/adrs`).reply(200, mappings);
            await expect(adrService.fetchAdrIdForSlug(namespace, 'missing')).rejects.toThrow(
                `Error resolving ADR slug missing in namespace ${namespace}:`
            );
        });

        it('rejects when the mapping list has no values', async () => {
            mock.onGet(`/calm/namespaces/${namespace}/adrs`).reply(200, {});
            await expect(adrService.fetchAdrIdForSlug(namespace, 'use-tls')).rejects.toThrow();
        });

        it('fetches the versions of an ADR by slug as strings', async () => {
            mock.onGet(`/calm/namespaces/${namespace}/adrs/use-oauth2/versions`).reply(200, { values: [1, '2'] });
            await expect(adrService.fetchAdrVersionsBySlug(namespace, 'use-oauth2')).resolves.toEqual(['1', '2']);
        });

        it('returns no versions when the response has none', async () => {
            mock.onGet(`/calm/namespaces/${namespace}/adrs/use-oauth2/versions`).reply(200, {});
            await expect(adrService.fetchAdrVersionsBySlug(namespace, 'use-oauth2')).resolves.toEqual([]);
        });

        it('rejects when the versions request fails', async () => {
            mock.onGet(`/calm/namespaces/${namespace}/adrs/use-oauth2/versions`).reply(404);
            await expect(adrService.fetchAdrVersionsBySlug(namespace, 'use-oauth2')).rejects.toThrow(
                'Error fetching versions for ADR use-oauth2:'
            );
        });
    });

    describe('fetchAdrByReference', () => {
        it('fetches a numeric id and revision from the storage API', async () => {
            mock.onGet(`/api/calm/namespaces/${namespace}/adrs/1/revisions/2`).reply(200, expectedAdr);
            await expect(adrService.fetchAdrByReference(namespace, '1', '2')).resolves.toEqual(expectedAdr);
        });

        it('resolves a slug to its numeric id first', async () => {
            mock.onGet(`/calm/namespaces/${namespace}/adrs`).reply(200, { values: [{ customId: 'use-oauth2', numericId: 7 }] });
            mock.onGet(`/api/calm/namespaces/${namespace}/adrs/7/revisions/3`).reply(200, expectedAdr);
            await expect(adrService.fetchAdrByReference(namespace, 'use-oauth2', '3')).resolves.toEqual(expectedAdr);
        });

        it('loads the newest revision for latest', async () => {
            mock.onGet(`/api/calm/namespaces/${namespace}/adrs/1/revisions`).reply(200, { values: [1, 10, 2] });
            mock.onGet(`/api/calm/namespaces/${namespace}/adrs/1/revisions/10`).reply(200, expectedAdr);
            await expect(adrService.fetchAdrByReference(namespace, '1', 'latest')).resolves.toEqual(expectedAdr);
        });

        it('rejects latest when the ADR has no revisions', async () => {
            mock.onGet(`/api/calm/namespaces/${namespace}/adrs/1/revisions`).reply(200, { values: [] });
            await expect(adrService.fetchAdrByReference(namespace, '1', 'latest')).rejects.toThrow('ADR 1 has no revisions');
        });
    });
});
