import { describe, expect, it } from 'vitest';
import { getAdrDisplayName, isCalmHubAdr, parseAdrReference, toAdrAppRoute } from './adr-utils';

describe('parseAdrReference', () => {
    it.each([
        ['/calm/namespaces/finos/adrs/use-oauth2/versions/3', { form: 'canonical', namespace: 'finos', id: 'use-oauth2', revision: '3' }],
        ['/calm/namespaces/finos/adrs/use-oauth2/versions/3/', { form: 'canonical', namespace: 'finos', id: 'use-oauth2', revision: '3' }],
        ['/calm/namespaces/platform.payments/adrs/use-kafka', { form: 'canonical', namespace: 'platform.payments', id: 'use-kafka', revision: undefined }],
        ['finos:adrs:use-oauth2@3', { form: 'curie', namespace: 'finos', id: 'use-oauth2', revision: '3' }],
        ['finos:adrs:use-oauth2', { form: 'curie', namespace: 'finos', id: 'use-oauth2', revision: undefined }],
        ['  finos:adrs:use-oauth2@3  ', { form: 'curie', namespace: 'finos', id: 'use-oauth2', revision: '3' }],
        ['/api/calm/namespaces/workshop/adrs/1', { form: 'legacy', namespace: 'workshop', id: '1', revision: undefined }],
        ['/api/calm/namespaces/workshop/adrs/1/revisions/2', { form: 'legacy', namespace: 'workshop', id: '1', revision: '2' }],
    ])('parses %s', (ref, expected) => {
        expect(parseAdrReference(ref, 'hub.example.com')).toEqual(expected);
    });

    it('parses a canonical absolute URL on the hub hostname', () => {
        expect(parseAdrReference('https://hub.example.com/calm/namespaces/finos/adrs/use-oauth2/versions/3', 'hub.example.com'))
            .toEqual({ form: 'canonical', namespace: 'finos', id: 'use-oauth2', revision: '3' });
    });

    it('parses a legacy absolute URL on the hub hostname', () => {
        expect(parseAdrReference('http://hub.example.com:8080/api/calm/namespaces/finos/adrs/7/revisions/1', 'hub.example.com'))
            .toEqual({ form: 'legacy', namespace: 'finos', id: '7', revision: '1' });
    });

    it('defaults the hostname to the current page', () => {
        const url = `http://${window.location.hostname}/calm/namespaces/finos/adrs/use-oauth2/versions/1`;
        expect(parseAdrReference(url)?.id).toBe('use-oauth2');
    });

    it.each([
        'https://other.example.com/calm/namespaces/finos/adrs/use-oauth2/versions/3',
        'https://github.com/org/project/docs/adr/0001-use-oauth2.md',
        'https://hub.example.com/some/other/path',
        'https://',
        '/api/calm/namespaces/workshop/adrs/not-a-number',
        '/calm/namespaces/finos/architectures/a/versions/1',
        'finos:architectures:payments@1',
        'finos:adrs:',
        'not an adr',
        '',
    ])('returns null for %s', (ref) => {
        expect(parseAdrReference(ref, 'hub.example.com')).toBeNull();
    });
});

describe('getAdrDisplayName', () => {
    it('names a canonical reference by slug, revision and namespace', () => {
        expect(getAdrDisplayName('/calm/namespaces/finos/adrs/use-oauth2/versions/3')).toBe('use-oauth2 rev 3 (finos)');
    });

    it('names a CURIE without a revision', () => {
        expect(getAdrDisplayName('finos:adrs:use-oauth2')).toBe('use-oauth2 (finos)');
    });

    it('names a legacy reference with a revision', () => {
        expect(getAdrDisplayName('/api/calm/namespaces/workshop/adrs/1/revisions/2')).toBe('ADR 1 rev 2 (workshop)');
    });

    it('uses the last path segment of an absolute URL on another host', () => {
        expect(getAdrDisplayName('https://other.example.com/calm/namespaces/finos/adrs/use-oauth2/versions/3', 'hub.example.com')).toBe('3');
    });

    it('falls back to the raw value when the URL has no path', () => {
        expect(getAdrDisplayName('https://example.com')).toBe('https://example.com');
    });
});

describe('isCalmHubAdr', () => {
    it('recognises canonical URLs and CURIEs', () => {
        expect(isCalmHubAdr('/calm/namespaces/finos/adrs/use-oauth2/versions/3')).toBe(true);
        expect(isCalmHubAdr('finos:adrs:use-oauth2@3')).toBe(true);
    });

    it('rejects an absolute URL on another hub', () => {
        expect(isCalmHubAdr('https://other.example.com/calm/namespaces/finos/adrs/x/versions/1', 'hub.example.com')).toBe(false);
    });
});

describe('toAdrAppRoute', () => {
    it('routes a canonical URL to its slug and revision', () => {
        expect(toAdrAppRoute('/calm/namespaces/finos/adrs/use-oauth2/versions/3')).toBe('/finos/adrs/use-oauth2/3');
    });

    it('routes a CURIE to its slug and revision', () => {
        expect(toAdrAppRoute('finos:adrs:use-oauth2@3')).toBe('/finos/adrs/use-oauth2/3');
    });

    it('routes a slug without a revision to the latest revision', () => {
        expect(toAdrAppRoute('finos:adrs:use-oauth2')).toBe('/finos/adrs/use-oauth2/latest');
        expect(toAdrAppRoute('/calm/namespaces/finos/adrs/use-oauth2')).toBe('/finos/adrs/use-oauth2/latest');
    });

    it('routes a legacy URL with a revision to that revision', () => {
        expect(toAdrAppRoute('/api/calm/namespaces/workshop/adrs/1/revisions/4')).toBe('/workshop/adrs/1/4');
    });

    it('decodes then re-encodes path segments', () => {
        expect(toAdrAppRoute('/calm/namespaces/finos/adrs/a%20b/versions/1')).toBe('/finos/adrs/a%20b/1');
    });

    it('keeps a malformed escape as it is', () => {
        expect(toAdrAppRoute('/calm/namespaces/finos/adrs/a%E0%A4%A/versions/1')).toBe('/finos/adrs/a%25E0%25A4%25A/1');
    });
});
