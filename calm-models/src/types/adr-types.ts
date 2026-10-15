//TODO: Move this to calm-widgets? This is a view model and not a CALM Type
export type CalmAdrMetaSchema = {
    namespace: string;
    id: number;
    slug?: string;
    revision: number;
    adr: CalmAdrSchema;
};

export type CalmAdrSchema = {
    title: string;
    status: CalmAdrStatus;
    creationDateTime: string;
    updateDateTime: string;
    decisionDate?: string;
    requesters?: string[];
    approvers?: string[];
    contextAndProblemStatement: string;
    decisionDrivers: string[];
    consideredOptions: CalmAdrOptionSchema[];
    decisionOutcome: CalmAdrDecisionSchema;
    links: CalmAdrLinkSchema[];
};

export type CalmAdrStatus =
    | 'draft'
    | 'proposed'
    | 'accepted'
    | 'superseded'
    | 'rejected'
    | 'deprecated';

export type CalmAdrOptionSchema = {
    name: string;
    description: string;
    positiveConsequences: string[];
    negativeConsequences: string[];
};

export type CalmAdrDecisionSchema = {
    chosenOption: CalmAdrOptionSchema;
    rationale: string;
};

export type CalmAdrLinkSchema = {
    rel: string;
    href: string;
};

/** An ADR in the CALM `adr.json` format, as stored in files and sent by the name-based CALM Hub API. */
export type CalmAdrDocumentSchema = {
    $id?: string;
    'unique-id'?: string;
    slug?: string;
    title: string;
    status: CalmAdrStatus;
    'decision-date'?: string;
    requesters?: string[];
    approvers?: string[];
    'context-and-problem-statement': string;
    'decision-drivers'?: string[];
    'considered-options'?: CalmAdrDocumentOptionSchema[];
    'decision-outcome'?: CalmAdrDocumentDecisionSchema;
    links?: CalmAdrLinkSchema[];
};

export type CalmAdrDocumentOptionSchema = {
    name: string;
    description: string;
    'positive-consequences'?: string[];
    'negative-consequences'?: string[];
};

export type CalmAdrDocumentDecisionSchema = {
    /** The name of an entry in `considered-options`. */
    'chosen-option': string;
    rationale: string;
};
