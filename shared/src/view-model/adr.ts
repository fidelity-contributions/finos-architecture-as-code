import {
    CalmAdrStatus,
    CalmAdrMetaSchema,
    CalmAdrSchema,
    CalmAdrOptionSchema,
    CalmAdrDecisionSchema,
    CalmAdrLinkSchema,
    CalmAdrDocumentSchema,
    CalmAdrDocumentOptionSchema,
} from '@finos/calm-models/types';

export class CalmAdrMeta {
    constructor(
        public namespace: string,
        public id: number,
        public revision: number,
        public adr: CalmAdr
    ) {}

    static fromJson(calmAdrMetaSchema: CalmAdrMetaSchema): CalmAdrMeta {
        return new CalmAdrMeta(
            calmAdrMetaSchema.namespace,
            calmAdrMetaSchema.id,
            calmAdrMetaSchema.revision,
            calmAdrMetaSchema.adr
        );
    }
}

export class CalmAdr {
    constructor(
        public title: string,
        public status: CalmAdrStatus,
        public creationDateTime: string,
        public updateDateTime: string,
        public contextAndProblemStatement: string,
        public decisionDrivers: string[],
        public consideredOptions: CalmOption[],
        public decisionOutcome: CalmAdrDecision,
        public links: CalmLink[]
    ) {}

    static fromJson(calmAdrSchema: CalmAdrSchema): CalmAdr {
        return new CalmAdr(
            calmAdrSchema.title,
            calmAdrSchema.status,
            calmAdrSchema.creationDateTime,
            calmAdrSchema.updateDateTime,
            calmAdrSchema.contextAndProblemStatement,
            calmAdrSchema.decisionDrivers,
            calmAdrSchema.consideredOptions.map((option) =>
                CalmOption.fromJson(option)
            ),
            calmAdrSchema.decisionOutcome,
            calmAdrSchema.links.map((link) => CalmLink.fromJson(link))
        );
    }
}

export class CalmOption {
    constructor(
        public name: string,
        public description: string,
        public positiveConsequences: string[],
        public negativeConsequences: string[]
    ) {}

    static fromJson(optionSchema: CalmAdrOptionSchema): CalmOption {
        return new CalmOption(
            optionSchema.name,
            optionSchema.description,
            optionSchema.positiveConsequences,
            optionSchema.negativeConsequences
        );
    }
}

export class CalmAdrDecision {
    constructor(
        public chosenOption: CalmOption,
        public rationale: string
    ) {}

    static fromJson(decisionSchema: CalmAdrDecisionSchema): CalmAdrDecision {
        return new CalmAdrDecision(
            CalmOption.fromJson(decisionSchema.chosenOption),
            decisionSchema.rationale
        );
    }
}

export class CalmLink {
    constructor(
        public rel: string,
        public href: string
    ) {}

    static fromJson(linkSchema: CalmAdrLinkSchema): CalmLink {
        return new CalmLink(linkSchema.rel, linkSchema.href);
    }
}

/** An ADR body in the CALM Hub camelCase model, without the timestamps that CALM Hub manages. */
export type CalmAdrContent = Omit<CalmAdrSchema, 'creationDateTime' | 'updateDateTime' | 'decisionOutcome'> & {
    decisionOutcome?: CalmAdrDecisionSchema;
};

/**
 * Converts a CALM Hub camelCase ADR to the `adr.json` kebab-case format.
 * Drops `creationDateTime` and `updateDateTime`, and writes `chosen-option` as the name of the chosen option.
 * Empty optional arrays are omitted, because the Hub model cannot tell them apart from absent ones.
 */
export function toAdrDocument(adr: CalmAdrSchema | CalmAdrContent, slug?: string): CalmAdrDocumentSchema {
    const document: CalmAdrDocumentSchema = {
        ...(slug ? { slug } : {}),
        title: adr.title,
        status: adr.status,
        'context-and-problem-statement': adr.contextAndProblemStatement,
    };
    if (adr.decisionDate) document['decision-date'] = adr.decisionDate;
    setIfNotEmpty(document, 'requesters', adr.requesters);
    setIfNotEmpty(document, 'approvers', adr.approvers);
    setIfNotEmpty(document, 'decision-drivers', adr.decisionDrivers);
    setIfNotEmpty(document, 'considered-options', adr.consideredOptions?.map(toAdrDocumentOption));
    const chosenOptionName = adr.decisionOutcome?.chosenOption?.name;
    if (adr.decisionOutcome && chosenOptionName !== undefined) {
        document['decision-outcome'] = {
            'chosen-option': chosenOptionName,
            rationale: adr.decisionOutcome.rationale,
        };
    }
    setIfNotEmpty(document, 'links', adr.links?.map(link => ({ rel: link.rel, href: link.href })));
    return document;
}

/** Converts a CALM Hub ADR envelope to the `adr.json` format, with its slug. */
export function adrMetaToAdrDocument(meta: CalmAdrMetaSchema): CalmAdrDocumentSchema {
    return toAdrDocument(meta.adr, meta.slug);
}

/**
 * Converts an `adr.json` kebab-case ADR to the CALM Hub camelCase model.
 * `chosen-option` names an entry in `considered-options`; the full option is copied from that entry.
 * @throws Error when `chosen-option` does not name an entry in `considered-options`.
 */
export function fromAdrDocument(document: CalmAdrDocumentSchema): CalmAdrContent {
    const consideredOptions = (document['considered-options'] ?? []).map(fromAdrDocumentOption);
    const adr: CalmAdrContent = {
        title: document.title,
        status: document.status,
        contextAndProblemStatement: document['context-and-problem-statement'],
        decisionDrivers: [...(document['decision-drivers'] ?? [])],
        consideredOptions,
        links: (document.links ?? []).map(link => ({ rel: link.rel, href: link.href })),
    };
    if (document['decision-date']) adr.decisionDate = document['decision-date'];
    if (document.requesters) adr.requesters = [...document.requesters];
    if (document.approvers) adr.approvers = [...document.approvers];

    const decision = document['decision-outcome'];
    if (decision) {
        const chosenOptionName = decision['chosen-option'];
        const chosenOption = consideredOptions.find(option => option.name === chosenOptionName);
        if (!chosenOption) {
            throw new Error(
                `ADR '${document.title}': decision-outcome.chosen-option '${chosenOptionName}' does not match the name of any considered-options entry`
            );
        }
        adr.decisionOutcome = { chosenOption, rationale: decision.rationale };
    }
    return adr;
}

function toAdrDocumentOption(option: CalmAdrOptionSchema): CalmAdrDocumentOptionSchema {
    const documentOption: CalmAdrDocumentOptionSchema = { name: option.name, description: option.description };
    setIfNotEmpty(documentOption, 'positive-consequences', option.positiveConsequences);
    setIfNotEmpty(documentOption, 'negative-consequences', option.negativeConsequences);
    return documentOption;
}

function fromAdrDocumentOption(option: CalmAdrDocumentOptionSchema): CalmAdrOptionSchema {
    return {
        name: option.name,
        description: option.description,
        positiveConsequences: [...(option['positive-consequences'] ?? [])],
        negativeConsequences: [...(option['negative-consequences'] ?? [])],
    };
}

function setIfNotEmpty(target: object, key: string, values: unknown[] | undefined): void {
    if (values && values.length > 0) {
        (target as Record<string, unknown>)[key] = values;
    }
}
