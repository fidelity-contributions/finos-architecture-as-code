import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ControlRequirementItem } from './ControlRequirementItem';
import type { ControlRequirement } from '../../../contracts/contracts';

describe('ControlRequirementItem', () => {
    it('renders an absent status as compliant', () => {
        render(
            <ControlRequirementItem
                requirement={{
                    'requirement-url': 'https://example.com/req/auth',
                    'config-url': 'https://example.com/config/auth',
                }}
            />
        );

        const badge = screen.getByTestId('control-status-badge');
        expect(badge).toHaveTextContent('compliant');
        expect(badge).toHaveAttribute('data-status', 'compliant');
        expect(screen.getByText('Config: https://example.com/config/auth')).toBeInTheDocument();
        expect(screen.queryByText('ADRs:')).not.toBeInTheDocument();
    });

    it('renders a compliant status with ADR links', () => {
        render(
            <ControlRequirementItem
                requirement={{
                    'requirement-url': 'https://example.com/req/auth',
                    config: { mfa: true },
                    status: 'compliant',
                    adrs: ['finos:adrs:use-oauth2@3'],
                }}
            />
        );

        expect(screen.getByTestId('control-status-badge')).toHaveAttribute('data-status', 'compliant');
        expect(screen.getByRole('link', { name: /use-oauth2 rev 3 \(finos\)/ })).toHaveAttribute(
            'href',
            '#/finos/adrs/use-oauth2/3'
        );
        expect(screen.getByText(/"mfa": true/)).toBeInTheDocument();
    });

    it('renders a non-compliant requirement without config, with its justifying ADRs', () => {
        const requirement: ControlRequirement = {
            'requirement-url': 'https://example.com/req/encryption',
            status: 'non-compliant',
            adrs: [
                '/calm/namespaces/finos/adrs/defer-encryption/versions/2',
                'https://github.com/org/project/docs/adr/0009-defer.md',
            ],
        };
        render(<ControlRequirementItem requirement={requirement} />);

        const badge = screen.getByTestId('control-status-badge');
        expect(badge).toHaveTextContent('non-compliant');
        expect(badge).toHaveAttribute('data-status', 'non-compliant');
        expect(screen.getByText('https://example.com/req/encryption')).toBeInTheDocument();
        expect(screen.queryByText('Configuration:')).not.toBeInTheDocument();
        expect(screen.queryByText(/^Config:/)).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /defer-encryption rev 2 \(finos\)/ })).toHaveAttribute(
            'href',
            '#/finos/adrs/defer-encryption/2'
        );
        expect(screen.getByRole('link', { name: /0009-defer.md/ })).toHaveAttribute('target', '_blank');
    });

    it('does not bubble ADR link clicks to the control card', () => {
        const onCardClick = vi.fn();
        render(
            <div onClick={onCardClick}>
                <ControlRequirementItem
                    requirement={{ status: 'non-compliant', adrs: ['https://example.com/adr/1.md'] }}
                />
            </div>
        );

        fireEvent.click(screen.getByRole('link', { name: /1.md/ }));
        expect(onCardClick).not.toHaveBeenCalled();
    });

    it('lets a node in appliesTo be selected', () => {
        const onNodeClick = vi.fn();
        render(
            <ControlRequirementItem
                requirement={{
                    'requirement-url': 'https://example.com/req/auth',
                    config: { appliesTo: { nodes: ['api'], relationships: ['api-db'] } },
                }}
                onNodeClick={onNodeClick}
            />
        );

        const nodeTag = screen.getByText('api');
        fireEvent.mouseEnter(nodeTag);
        expect(nodeTag.style.background).not.toBe('');
        fireEvent.mouseLeave(nodeTag);
        fireEvent.click(nodeTag);
        expect(onNodeClick).toHaveBeenCalledWith('api');
        expect(screen.getByText('api-db')).toBeInTheDocument();
    });

    it('underlines links on hover and keeps link clicks off the card', () => {
        const onCardClick = vi.fn();
        render(
            <div onClick={onCardClick}>
                <ControlRequirementItem
                    requirement={{ 'requirement-url': 'https://example.com/req', 'config-url': 'https://example.com/cfg' }}
                />
            </div>
        );

        for (const link of [
            screen.getByRole('link', { name: 'https://example.com/req' }),
            screen.getByRole('link', { name: 'Config: https://example.com/cfg' }),
        ]) {
            fireEvent.mouseEnter(link);
            expect(link.style.textDecoration).toBe('underline');
            fireEvent.mouseLeave(link);
            expect(link.style.textDecoration).toBe('none');
            fireEvent.click(link);
        }
        expect(onCardClick).not.toHaveBeenCalled();
    });
});
