import { chosenOptionIsConsidered } from './chosen-option-is-considered';

const options = [
    { name: 'OAuth2', description: 'Use OAuth2.' },
    { name: 'API keys', description: 'Use static keys.' }
];

describe('chosenOptionIsConsidered', () => {
    it('should return an empty array when there is no input', () => {
        expect(chosenOptionIsConsidered(null)).toEqual([]);
    });

    it('should return an empty array when there is no decision-outcome', () => {
        expect(chosenOptionIsConsidered({ 'considered-options': options })).toEqual([]);
    });

    it('should return an empty array when chosen-option is not a string', () => {
        expect(chosenOptionIsConsidered({ 'decision-outcome': { 'chosen-option': 42 } })).toEqual([]);
    });

    it('should return an empty array when chosen-option names a considered option', () => {
        const input = { 'considered-options': options, 'decision-outcome': { 'chosen-option': 'API keys' } };
        expect(chosenOptionIsConsidered(input)).toEqual([]);
    });

    it('should flag a chosen-option that names no considered option', () => {
        const input = { 'considered-options': options, 'decision-outcome': { 'chosen-option': 'mTLS' } };

        const result = chosenOptionIsConsidered(input);

        expect(result).toEqual([{
            message: 'Chosen option \'mTLS\' does not match the name of any considered option.',
            path: ['decision-outcome', 'chosen-option']
        }]);
    });

    it('should flag a chosen-option when considered-options is absent or malformed', () => {
        expect(chosenOptionIsConsidered({ 'decision-outcome': { 'chosen-option': 'OAuth2' } })).toHaveLength(1);
        expect(chosenOptionIsConsidered({ 'considered-options': [null, { name: 1 }], 'decision-outcome': { 'chosen-option': 'OAuth2' } })).toHaveLength(1);
    });
});
