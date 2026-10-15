import { LATEST_ADR_REVISION } from '../../../model/calm.js';

export type AdrReferenceForm = 'canonical' | 'curie' | 'legacy';

/**
 * An ADR reference that resolves to a CALM Hub ADR. `id` is the slug for the
 * canonical and CURIE forms and the numeric storage id for the legacy form.
 */
export interface AdrReference {
    form: AdrReferenceForm;
    namespace: string;
    id: string;
    revision?: string;
}

// /calm/namespaces/{ns}/adrs/{slug}[/versions/{revision}]
const CANONICAL_ADR_PATH = /^\/calm\/namespaces\/([^/]+)\/adrs\/([^/]+)(?:\/versions\/([^/]+))?\/?$/;
// {ns}:adrs:{slug}[@{revision}]
const ADR_CURIE = /^([^\s:/@]+):adrs:([^\s:/@]+)(?:@([^\s:/@]+))?$/;
// /api/calm/namespaces/{ns}/adrs/{id}[/revisions/{revision}]
const LEGACY_ADR_PATH = /^\/api\/calm\/namespaces\/([^/]+)\/adrs\/(\d+)(?:\/revisions\/(\d+))?\/?$/;

function decodeSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

function matchPath(path: string): AdrReference | null {
    const canonical = path.match(CANONICAL_ADR_PATH);
    if (canonical) {
        return {
            form: 'canonical',
            namespace: decodeSegment(canonical[1]),
            id: decodeSegment(canonical[2]),
            revision: canonical[3],
        };
    }
    const legacy = path.match(LEGACY_ADR_PATH);
    if (legacy) {
        return { form: 'legacy', namespace: legacy[1], id: legacy[2], revision: legacy[3] };
    }
    return null;
}

/**
 * Parses a CALM Hub ADR reference: a canonical slug URL, an ADR CURIE or a legacy
 * numeric storage URL. Absolute URLs count only on this hub's hostname (matched by
 * hostname, not origin, so the dev UI and backend on different ports still match).
 */
export function parseAdrReference(ref: string, hostname: string = window.location.hostname): AdrReference | null {
    const value = ref.trim();

    const curie = value.match(ADR_CURIE);
    if (curie) {
        return { form: 'curie', namespace: curie[1], id: curie[2], revision: curie[3] };
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
        try {
            const url = new URL(value);
            return url.hostname === hostname ? matchPath(url.pathname) : null;
        } catch {
            return null;
        }
    }

    return matchPath(value);
}

/**
 * Extract a display name from an ADR reference.
 * Uses the last meaningful path segment or filename for anything not on the hub.
 */
export function getAdrDisplayName(url: string, hostname?: string): string {
    const ref = parseAdrReference(url, hostname);
    if (ref) {
        const label = ref.form === 'legacy' ? `ADR ${ref.id}` : ref.id;
        const revision = ref.revision ? ` rev ${ref.revision}` : '';
        return `${label}${revision} (${ref.namespace})`;
    }
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(Boolean);
        return segments[segments.length - 1] || url;
    } catch {
        // Not a full URL — use the last path segment
        const segments = url.split('/').filter(Boolean);
        return segments[segments.length - 1] || url;
    }
}

/**
 * Check if an ADR reference is an internal calm-hub link.
 */
export function isCalmHubAdr(url: string, hostname?: string): boolean {
    return parseAdrReference(url, hostname) !== null;
}

/**
 * Convert a calm-hub ADR reference to an in-app hash route.
 * /api/calm/namespaces/workshop/adrs/1 → /workshop/adrs/1/1
 * finos:adrs:use-oauth2@3 → /finos/adrs/use-oauth2/3
 * /calm/namespaces/finos/adrs/use-oauth2 → /finos/adrs/use-oauth2/latest
 */
export function toAdrAppRoute(url: string, hostname?: string): string {
    const ref = parseAdrReference(url, hostname);
    if (!ref) {
        return url;
    }
    // A legacy link without a revision has always opened revision 1.
    const revision = ref.revision ?? (ref.form === 'legacy' ? '1' : LATEST_ADR_REVISION);
    return `/${encodeURIComponent(ref.namespace)}/adrs/${encodeURIComponent(ref.id)}/${encodeURIComponent(revision)}`;
}
