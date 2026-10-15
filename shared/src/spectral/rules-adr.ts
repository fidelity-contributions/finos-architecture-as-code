import { RulesetDefinition } from '@stoplight/spectral-core';
import { chosenOptionIsConsidered } from './functions/adr/chosen-option-is-considered';

const adrRules: RulesetDefinition = {
    rules: {
        'adr-chosen-option-must-be-a-considered-option': {
            description: 'decision-outcome.chosen-option must name an entry in considered-options',
            severity: 'error',
            message: '{{error}}',
            given: '$',
            then: {
                function: chosenOptionIsConsidered
            },
        },
    }
};

export default adrRules;
