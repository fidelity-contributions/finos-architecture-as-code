import { AxiosInstance } from 'axios';
import { getAuthHeaders } from '../../authService.js';
import { CalmAdrMetaSchema } from '@finos/calm-models/types';
import { AdrSummary, isSlug, LATEST_ADR_REVISION } from '../../model/calm.js';
import { pickLatestVersion } from '../../model/version.js';
import { apiClient } from '../utils/api-client.js';

interface AdrMapping {
    customId: string;
    numericId: number;
}

export class AdrService {
    private readonly ax: AxiosInstance;

    constructor(axiosInstance?: AxiosInstance) {
        if (axiosInstance) {
            this.ax = axiosInstance;
        } else {
            this.ax = apiClient;
        }
    }
    /**
     * Fetch ADR summaries for a given namespace.
     */
    async fetchAdrSummaries(namespace: string): Promise<AdrSummary[]> {
        const headers = await getAuthHeaders();
        return this.ax
            .get(`/api/calm/namespaces/${encodeURIComponent(namespace)}/adrs`, {
                headers,
            })
            .then((res) => {
                return Array.isArray(res.data?.values) ? res.data.values : [];
            })
            .catch((error) => {
                const errorMessage = `Error fetching ADR summaries for namespace ${namespace}:`;
                console.error('Error fetching ADR summaries for namespace %s:', namespace, error);
                return Promise.reject(new Error(errorMessage));
            });
    }

    /**
     * Fetch revisions for a given namespace and adr ID and set them using the provided setter function.
     */
    async fetchAdrRevisions(namespace: string, adrID: string): Promise<number[]> {
        const headers = await getAuthHeaders();
        return this.ax
            .get(`/api/calm/namespaces/${encodeURIComponent(namespace)}/adrs/${encodeURIComponent(adrID)}/revisions`, {
                headers,
            })
            .then((res) => (Array.isArray(res.data?.values) ? res.data.values : []))
            .catch((error) => {
                const errorMessage = `Error fetching revisions for ADR ID ${adrID}:`;
                console.error('Error fetching revisions for ADR ID %s:', adrID, error);
                return Promise.reject(new Error(errorMessage));
            });
    }

    /**
     * Fetch a specific adr by namespace, adr ID, and revision, and set it using the provided setter function.
     */
    async fetchAdr(namespace: string, adrID: string, revision: string): Promise<CalmAdrMetaSchema> {
        const headers = await getAuthHeaders();
        return this.ax
            .get(`/api/calm/namespaces/${encodeURIComponent(namespace)}/adrs/${encodeURIComponent(adrID)}/revisions/${encodeURIComponent(revision)}`, {
                headers,
            })
            .then((res) => res.data)
            .catch((error) => {
                const errorMessage = `Error fetching adr for namespace ${namespace}, adr ID ${adrID}, revision ${revision}:`;
                console.error('Error fetching adr for namespace %s, adr ID %s, revision %s:', namespace, adrID, revision, error);
                return Promise.reject(new Error(errorMessage));
            });
    }

    /**
     * Resolve an ADR slug to its numeric storage id via the name-based API.
     */
    async fetchAdrIdForSlug(namespace: string, slug: string): Promise<number> {
        const headers = await getAuthHeaders();
        return this.ax
            .get(`/calm/namespaces/${encodeURIComponent(namespace)}/adrs`, { headers })
            .then((res) => {
                const mappings: AdrMapping[] = Array.isArray(res.data?.values) ? res.data.values : [];
                const match = mappings.find((m) => m.customId === slug);
                if (!match) {
                    throw new Error(`No ADR with slug ${slug}`);
                }
                return match.numericId;
            })
            .catch((error) => {
                const errorMessage = `Error resolving ADR slug ${slug} in namespace ${namespace}:`;
                console.error('Error resolving ADR slug %s in namespace %s:', slug, namespace, error);
                return Promise.reject(new Error(errorMessage));
            });
    }

    /**
     * Fetch the revisions of an ADR by slug via the name-based API.
     */
    async fetchAdrVersionsBySlug(namespace: string, slug: string): Promise<string[]> {
        const headers = await getAuthHeaders();
        return this.ax
            .get(`/calm/namespaces/${encodeURIComponent(namespace)}/adrs/${encodeURIComponent(slug)}/versions`, {
                headers,
            })
            .then((res) => (Array.isArray(res.data?.values) ? res.data.values.map(String) : []))
            .catch((error) => {
                const errorMessage = `Error fetching versions for ADR ${slug}:`;
                console.error('Error fetching versions for ADR %s:', slug, error);
                return Promise.reject(new Error(errorMessage));
            });
    }

    /**
     * Fetch an ADR by numeric id or slug. A revision of {@link LATEST_ADR_REVISION}
     * loads the newest revision. Slugs resolve to the numeric id first, because only
     * the storage API returns the `AdrMeta` shape the renderer needs.
     */
    async fetchAdrByReference(namespace: string, idOrSlug: string, revision: string): Promise<CalmAdrMetaSchema> {
        const adrID = isSlug(idOrSlug) ? String(await this.fetchAdrIdForSlug(namespace, idOrSlug)) : idOrSlug;
        let resolvedRevision = revision;
        if (revision === LATEST_ADR_REVISION) {
            const revisions = await this.fetchAdrRevisions(namespace, adrID);
            const latest = pickLatestVersion(revisions.filter((rev) => rev != null).map(String));
            if (!latest) {
                return Promise.reject(new Error(`ADR ${idOrSlug} has no revisions`));
            }
            resolvedRevision = latest;
        }
        return this.fetchAdr(namespace, adrID, resolvedRevision);
    }
}
