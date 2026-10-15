import type { CalmControlStatusSchema } from '@finos/calm-models/types';

//These types and interfaces represent CALM control data.

/**
 * Configuration for a control requirement
 */
export interface ControlRequirementConfig {
    appliesTo?: {
        nodes?: string[];
        relationships?: string[];
    };
    [key: string]: unknown;
}

/**
 * Control requirement specification
 */
export interface ControlRequirement {
    'requirement-url'?: string;
    'config-url'?: string;
    config?: ControlRequirementConfig;
    /** Absent means `compliant`. A `non-compliant` requirement may have no config. */
    status?: CalmControlStatusSchema;
    /** ADRs that justify the status, most often a deviation. */
    adrs?: string[];
}

/**
 * Control applied to nodes or relationships
 */
export interface Control {
    description?: string;
    requirements?: ControlRequirement[];
    'aigf-mitigations'?: string[];
    'aigf-risks'?: string[];
    // Extended properties added during extraction
    appliesTo?: string;
    nodeName?: string;
    relationshipDescription?: string;
    appliesToType?: 'node' | 'relationship';
}

/**
 * Props for ControlsPanel component
 */
export interface ControlsPanelProps {
    controls: Record<string, Control>;
    onNodeClick?: (nodeId: string) => void;
    onControlClick?: (controlId: string) => void;
}
