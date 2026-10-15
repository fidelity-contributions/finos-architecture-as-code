import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdrsPanel } from './AdrsPanel';
import { getAdrDisplayName, isCalmHubAdr, toAdrAppRoute } from './adr-utils';
import type { ElementAdrs } from '../../contracts/contracts';
import { THEME } from './theme';

const elementAdrs: ElementAdrs[] = [
    { id: 'api', name: 'Payments API', kind: 'node', adrs: ['finos:adrs:use-oauth2@3'] },
    {
        id: 'api-db',
        name: 'API to DB',
        kind: 'relationship',
        adrs: ['/calm/namespaces/finos/adrs/use-tls/versions/1', 'https://example.com/adr/0007-pooling.md'],
    },
];

describe('AdrsPanel', () => {
    it('renders nothing when adrs is empty', () => {
        const { container } = render(<AdrsPanel adrs={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders header with count', () => {
        const adrs = [
            'https://github.com/org/project/docs/adr/0001-use-oauth2.md',
            'https://example.com/adr/0002-rate-limiting.pdf',
        ];
        render(<AdrsPanel adrs={adrs} />);
        expect(screen.getByText('Architecture Decision Records (2)')).toBeInTheDocument();
    });

    it('renders external ADR links with target _blank', () => {
        const adrs = ['https://github.com/org/project/docs/adr/0001-use-oauth2.md'];
        render(<AdrsPanel adrs={adrs} />);

        const link = screen.getByRole('link', { name: /0001-use-oauth2.md/ });
        expect(link).toHaveAttribute('href', 'https://github.com/org/project/docs/adr/0001-use-oauth2.md');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders calm-hub internal ADR links as in-app navigation', () => {
        const adrs = ['/api/calm/namespaces/workshop/adrs/1'];
        render(<AdrsPanel adrs={adrs} />);

        const link = screen.getByRole('link', { name: /ADR 1 \(workshop\)/ });
        expect(link).toHaveAttribute('href', '#/workshop/adrs/1/1');
        expect(link).not.toHaveAttribute('target');
    });

    it('renders a mix of external and internal links', () => {
        const adrs = [
            'https://github.com/org/project/docs/adr/0001-use-oauth2.md',
            '/api/calm/namespaces/finos/adrs/42',
        ];
        render(<AdrsPanel adrs={adrs} />);

        expect(screen.getByText('Architecture Decision Records (2)')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /0001-use-oauth2.md/ })).toHaveAttribute('target', '_blank');
        expect(screen.getByRole('link', { name: /ADR 42 \(finos\)/ })).toHaveAttribute('href', '#/finos/adrs/42/1');
    });

    it('renders each unique ADR as a distinct link using the ADR URL as key', () => {
        const adrs = [
            'https://github.com/org/project/docs/adr/0001-use-oauth2.md',
            'https://github.com/org/project/docs/adr/0002-rate-limiting.md',
            '/api/calm/namespaces/workshop/adrs/1',
            '/api/calm/namespaces/finos/adrs/42',
        ];
        render(<AdrsPanel adrs={adrs} />);

        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(4);
        expect(screen.getByText('Architecture Decision Records (4)')).toBeInTheDocument();
    });
});

describe('AdrsPanel node-level ADRs', () => {
    it('renders node-level ADRs when only elements carry ADRs', () => {
        render(<AdrsPanel adrs={[]} elementAdrs={[elementAdrs[0]]} />);

        expect(screen.getByText('Architecture Decision Records (1)')).toBeInTheDocument();
        const section = screen.getByRole('region', { name: 'Node: Payments API' });
        expect(within(section).getByRole('link', { name: /use-oauth2 rev 3 \(finos\)/ })).toHaveAttribute(
            'href',
            '#/finos/adrs/use-oauth2/3'
        );
    });

    it('lists architecture ADRs then every element when nothing is selected', () => {
        render(<AdrsPanel adrs={['/api/calm/namespaces/finos/adrs/42']} elementAdrs={elementAdrs} />);

        expect(screen.getByText('Architecture Decision Records (4)')).toBeInTheDocument();
        const titles = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
        expect(titles).toEqual(['Architecture', 'Node: Payments API', 'Relationship: API to DB']);
    });

    it('shows the selected node ADRs first, then the architecture ADRs', () => {
        render(
            <AdrsPanel adrs={['/api/calm/namespaces/finos/adrs/42']} elementAdrs={elementAdrs} selectedElementId="api" />
        );

        expect(screen.getByText('Architecture Decision Records (2)')).toBeInTheDocument();
        const titles = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
        expect(titles).toEqual(['Node: Payments API', 'Architecture']);
        expect(screen.queryByText('Relationship: API to DB')).not.toBeInTheDocument();
    });

    it('shows the selected relationship ADRs', () => {
        render(<AdrsPanel adrs={[]} elementAdrs={elementAdrs} selectedElementId="api-db" />);

        const section = screen.getByRole('region', { name: 'Relationship: API to DB' });
        expect(within(section).getByRole('link', { name: /use-tls rev 1 \(finos\)/ })).toHaveAttribute(
            'href',
            '#/finos/adrs/use-tls/1'
        );
        expect(within(section).getByRole('link', { name: /0007-pooling.md/ })).toHaveAttribute('target', '_blank');
    });

    it('falls back to the full list when the selected element has no ADRs', () => {
        render(<AdrsPanel adrs={[]} elementAdrs={elementAdrs} selectedElementId="other" />);
        expect(screen.getByText('Architecture Decision Records (3)')).toBeInTheDocument();
    });

    it('omits the section title when only architecture ADRs exist', () => {
        render(<AdrsPanel adrs={['https://example.com/adr/1.md']} elementAdrs={[]} />);
        expect(screen.queryByRole('heading', { level: 4 })).not.toBeInTheDocument();
    });

    it('highlights a link on hover', () => {
        render(<AdrsPanel adrs={['https://example.com/adr/1.md']} />);
        const link = screen.getByRole('link');
        fireEvent.mouseEnter(link);
        expect(link).toHaveStyle({ background: THEME.colors.backgroundSecondary });
        fireEvent.mouseLeave(link);
        expect(link).toHaveStyle({ background: THEME.colors.card });
    });
});

describe('getAdrDisplayName', () => {
    it('extracts filename from external URL', () => {
        expect(getAdrDisplayName('https://github.com/org/project/docs/adr/0001-use-oauth2.md')).toBe('0001-use-oauth2.md');
    });

    it('extracts filename from URL ending with .pdf', () => {
        expect(getAdrDisplayName('https://internal-docs.company.com/adr/0001-rate-limiting.pdf')).toBe('0001-rate-limiting.pdf');
    });

    it('formats calm-hub internal link', () => {
        expect(getAdrDisplayName('/api/calm/namespaces/workshop/adrs/1')).toBe('ADR 1 (workshop)');
    });

    it('handles plain path segments', () => {
        expect(getAdrDisplayName('/some/random/path')).toBe('path');
    });

    it('falls back to full string when no segments', () => {
        expect(getAdrDisplayName('')).toBe('');
    });
});

describe('isCalmHubAdr', () => {
    it('returns true for calm-hub ADR paths', () => {
        expect(isCalmHubAdr('/api/calm/namespaces/workshop/adrs/1')).toBe(true);
        expect(isCalmHubAdr('/api/calm/namespaces/finos/adrs/42')).toBe(true);
    });

    it('returns false for external URLs', () => {
        expect(isCalmHubAdr('https://github.com/org/project/docs/adr/0001.md')).toBe(false);
    });

    it('returns false for non-matching paths', () => {
        expect(isCalmHubAdr('/some/other/path')).toBe(false);
    });
});

describe('toAdrAppRoute', () => {
    it('converts calm-hub path to app hash route', () => {
        expect(toAdrAppRoute('/api/calm/namespaces/workshop/adrs/1')).toBe('/workshop/adrs/1/1');
    });

    it('converts with different namespace', () => {
        expect(toAdrAppRoute('/api/calm/namespaces/finos/adrs/42')).toBe('/finos/adrs/42/1');
    });

    it('returns original URL for non-matching paths', () => {
        expect(toAdrAppRoute('https://example.com/adr')).toBe('https://example.com/adr');
    });
});
