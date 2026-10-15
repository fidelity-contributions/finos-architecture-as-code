import { CalmControl, CalmControlDetail, controlStatus } from './control.js';
import { CalmControls } from './control';
import { CalmControlsSchema } from '../types/control-types';
import { Resolvable } from './resolvable';

describe('CalmControls', () => {
    const controlsSchema:CalmControlsSchema = {
        authentication: {
            description: 'Authentication control',
            requirements: [
                {
                    'requirement-url': 'https://example.com/auth',
                    'config-url': 'https://example.com/auth-config.json'
                }
            ]
        },
        authorization: {
            description: 'Authorization control',
            requirements: [
                {
                    'requirement-url': 'https://example.com/authz',
                    'config-url': 'https://example.com/authz-config.json'

                }
            ]
        }
    };

    it('should return the canonical model with toCanonicalSchema()', () => {
        const controls = CalmControls.fromSchema(controlsSchema);
        expect(controls.toCanonicalSchema()).toEqual({
            authentication: {
                description: 'Authentication control',
                requirements: [
                    { 'requirement-url': 'https://example.com/auth' }
                ]
            },
            authorization: {
                description: 'Authorization control',
                requirements: [
                    { 'requirement-url': 'https://example.com/authz' }
                ]
            }
        });
    });

    it('should handle control with config-url', () => {
        const controlsSchemaWithConfig = {
            authentication: {
                description: 'Authentication control',
                requirements: [
                    {
                        'requirement-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-requirement.json',
                        'config-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-config.json'
                    }
                ]
            }
        };
        const controls = CalmControls.fromSchema(controlsSchemaWithConfig);
        expect(controls.toCanonicalSchema()).toEqual({
            authentication: {
                description: 'Authentication control',
                requirements: [
                    {
                        'requirement-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-requirement.json'
                        // config is not resolved, so not included in canonical
                    }
                ]
            }
        });
    });

    it('should handle control with config', () => {
        const controlsSchemaWithConfig = {
            authentication: {
                description: 'Authentication control',
                requirements: [
                    {
                        'requirement-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-requirement.json',
                        config: { foo: 'bar', enabled: true }
                    }
                ]
            }
        };
        const controls = CalmControls.fromSchema(controlsSchemaWithConfig);
        expect(controls.toCanonicalSchema()).toEqual({
            authentication: {
                description: 'Authentication control',
                requirements: [
                    {
                        'requirement-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-requirement.json',
                        foo: 'bar',
                        enabled: true
                    }
                ]
            }
        });
    });

    it('should handle multiple controls with mixed requirements', () => {
        const controlsSchemaMixed = {
            authentication: {
                description: 'Authentication control',
                requirements: [
                    {
                        'requirement-url': 'https://example.com/auth',
                        'config-url': 'https://example.com/auth-config.json'
                    }
                ]
            },
            authorization: {
                description: 'Authorization control',
                requirements: [
                    {
                        'requirement-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authz-control-requirement.json',
                        config: { level: 'admin' }
                    }
                ]
            }
        };
        const controls = CalmControls.fromSchema(controlsSchemaMixed);
        expect(controls.toCanonicalSchema()).toEqual({
            authentication: {
                description: 'Authentication control',
                requirements: [
                    {
                        'requirement-url': 'https://example.com/auth'
                    }
                ]
            },
            authorization: {
                description: 'Authorization control',
                requirements: [
                    {
                        'requirement-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authz-control-requirement.json',
                        level: 'admin'
                    }
                ]
            }
        });
    });

    it('should throw or ignore if both config-url and config are present (invalid)', () => {
        const controlsSchemaInvalid = {
            authentication: {
                description: 'Authentication control',
                requirements: [
                    {
                        'requirement-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-requirement.json',
                        'config-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-config.json',
                        config: { foo: 'bar' }
                    }
                ]
            }
        };
        const controls = CalmControls.fromSchema(controlsSchemaInvalid);
        // Should prefer config-url and ignore config, so config is not spread
        expect(controls.toCanonicalSchema()).toEqual({
            authentication: {
                description: 'Authentication control',
                requirements: [
                    {
                        'requirement-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-requirement.json'
                    }
                ]
            }
        });
    });

    it('should handle control with no requirements', () => {
        const controlsSchemaNoReq = {
            authentication: {
                description: 'Authentication control',
                requirements: []
            }
        };
        const controls = CalmControls.fromSchema(controlsSchemaNoReq);
        expect(controls.toCanonicalSchema()).toEqual({
            authentication: {
                description: 'Authentication control',
                requirements: []
            }
        });
    });

    it('should return the original schema with toSchema()', () => {
        const controlsSchema: CalmControlsSchema = {
            authentication: {
                description: 'Authentication control',
                requirements: [
                    {
                        'requirement-url': 'https://example.com/auth',
                        'config-url': 'https://example.com/auth-config.json'
                    }
                ]
            }
        };
        const controls = CalmControls.fromSchema(controlsSchema);
        expect(controls.toSchema()).toEqual(controlsSchema);
    });

    it('should support fromSchema → toCanonicalSchema roundtrip', () => {
        const controlsSchema = {
            authentication: {
                description: 'Authentication control',
                requirements: [
                    {
                        'requirement-url': 'https://example.com/auth',
                        'config-url': 'https://example.com/auth-config.json'
                    }
                ]
            }
        };
        const controls = CalmControls.fromSchema(controlsSchema);
        expect(controls.toCanonicalSchema()).toEqual({
            authentication: {
                description: 'Authentication control',
                requirements: [
                    { 'requirement-url': 'https://example.com/auth' }
                ]
            }
        });
    });
});

describe('CalmControl', () => {
    const controlSchema = {
        description: 'Test Control',
        requirements: [
            {
                'requirement-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-requirement.json',
                'config-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-config.json'
            }
        ]
    };

    it('should create an instance from JSON schema', () => {
        const control = CalmControl.fromSchema(controlSchema);
        expect(control).toBeInstanceOf(CalmControl);
        expect(control.description).toBe('Test Control');
        expect(control.requirements).toHaveLength(1);
        expect(control.requirements[0]).toBeInstanceOf(CalmControlDetail);
        expect(control.requirements[0].requirement.reference).toBe('https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-requirement.json');
        expect(control.requirements[0].configUrl.reference).toBe('https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-config.json');
    });

    it('should return the canonical model with toCanonicalSchema()', () => {
        const control = CalmControl.fromSchema(controlSchema);
        expect(control.toCanonicalSchema()).toEqual({
            description: 'Test Control',
            requirements: [
                {
                    'requirement-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-requirement.json',
                }
            ]
        });
    });

    it('should return the original schema with toSchema()', () => {
        const control = CalmControl.fromSchema(controlSchema);
        expect(control.toSchema()).toEqual(controlSchema);
    });

    it('should use resolved configUrl value in toCanonicalSchema()', () => {
        const control = CalmControl.fromSchema(controlSchema);

        const mockConfigUrl = {
            get isResolved() {
                return true;
            },
            get value() {
                return { foo: 'bar', enabled: true };
            }
        } as unknown as Resolvable<Record<string, unknown>>;

        // Override the requirement's configUrl with our mock
        control.requirements[0].configUrl = mockConfigUrl;

        expect(control.toCanonicalSchema()).toEqual({
            description: 'Test Control',
            requirements: [
                {
                    'requirement-url': 'https://calm.finos.org/release/1.0-rc2/prototype/authentication-control-requirement.json',
                    foo: 'bar',
                    enabled: true
                }
            ]
        });
    });


});

describe('control status and adrs', () => {
    const requirementUrl = 'https://example.com/requirement.json';

    it('treats an absent status as compliant and does not add it to the canonical model', () => {
        const detail = CalmControlDetail.fromSchema({ 'requirement-url': requirementUrl, config: { a: 1 } });
        expect(detail.status).toBe('compliant');
        expect(controlStatus({})).toBe('compliant');
        expect(detail.toCanonicalSchema()).toEqual({ 'requirement-url': requirementUrl, a: 1 });
    });

    it('models a non-compliant requirement with ADRs and no config', () => {
        const detail = CalmControlDetail.fromSchema({
            'requirement-url': requirementUrl,
            status: 'non-compliant',
            adrs: ['finos:adrs:accept-plain-http@1'],
        });
        expect(detail.status).toBe('non-compliant');
        expect(detail.adrs).toEqual(['finos:adrs:accept-plain-http@1']);
        expect(detail.config).toBeUndefined();
        expect(detail.configUrl).toBeUndefined();
        expect(detail.toCanonicalSchema()).toEqual({
            'requirement-url': requirementUrl,
            status: 'non-compliant',
            adrs: ['finos:adrs:accept-plain-http@1'],
        });
    });

    it('keeps an explicit compliant status and the ADRs of a compliant requirement', () => {
        const detail = CalmControlDetail.fromSchema({
            'requirement-url': requirementUrl,
            'config-url': 'https://example.com/config.json',
            status: 'compliant',
            adrs: ['finos:adrs:use-oauth2@2'],
        });
        expect(detail.configUrl?.reference).toBe('https://example.com/config.json');
        expect(detail.toCanonicalSchema()).toEqual({
            'requirement-url': requirementUrl,
            status: 'compliant',
            adrs: ['finos:adrs:use-oauth2@2'],
        });
    });
});
