import { IFunctionResult } from '@stoplight/spectral-core';

interface AdrInput {
    'considered-options'?: unknown;
    'decision-outcome'?: { 'chosen-option'?: unknown };
}

/**
 * Checks that decision-outcome.chosen-option names an entry in considered-options.
 * JSON Schema cannot check this, because it refers to sibling instance data.
 */
export function chosenOptionIsConsidered(input: AdrInput | null | undefined, _?: unknown, _context?: unknown): IFunctionResult[] {
    const chosenOption = input?.['decision-outcome']?.['chosen-option'];
    if (typeof chosenOption !== 'string') {
        return [];
    }

    const consideredOptions = Array.isArray(input?.['considered-options']) ? input['considered-options'] : [];
    const names = consideredOptions
        .map(option => (option as { name?: unknown } | null)?.name)
        .filter((name): name is string => typeof name === 'string');
    if (names.includes(chosenOption)) {
        return [];
    }

    return [{
        message: `Chosen option '${chosenOption}' does not match the name of any considered option.`,
        path: ['decision-outcome', 'chosen-option']
    }];
}
