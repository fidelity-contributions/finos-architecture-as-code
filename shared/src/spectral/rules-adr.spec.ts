import adrRules from './rules-adr';
import { runSpectralValidations } from '../commands/validate/validation-helpers';

const CODE = 'adr-chosen-option-must-be-a-considered-option';

async function issuesFor(adr: object) {
    return (await runSpectralValidations(JSON.stringify(adr), adrRules, 'adr')).spectralIssues;
}

const baseAdr = {
    title: 'Use OAuth2',
    status: 'accepted',
    'context-and-problem-statement': 'We need delegated authorisation.',
    'considered-options': [
        { name: 'OAuth2', description: 'Use OAuth2.' },
        { name: 'API keys', description: 'Use static keys.' }
    ]
};

describe('ADR ruleset', () => {
    it('flags a dangling chosen-option', async () => {
        const issues = await issuesFor({ ...baseAdr, 'decision-outcome': { 'chosen-option': 'mTLS', rationale: 'r' } });

        expect(issues).toHaveLength(1);
        expect(issues[0].code).toBe(CODE);
        expect(issues[0].severity).toBe('error');
        expect(issues[0].path).toBe('/decision-outcome/chosen-option');
    });

    it('passes a chosen-option that matches a considered option', async () => {
        expect(await issuesFor({ ...baseAdr, 'decision-outcome': { 'chosen-option': 'OAuth2', rationale: 'r' } })).toEqual([]);
    });

    it('passes an ADR with no decision-outcome', async () => {
        expect(await issuesFor(baseAdr)).toEqual([]);
    });
});
