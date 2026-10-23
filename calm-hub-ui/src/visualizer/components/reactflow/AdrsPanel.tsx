import { THEME } from './theme.js';
import type { AdrsPanelProps } from '../../contracts/contracts.js';
import { AdrLink } from './AdrLink.js';

export function AdrsPanel({ adrs }: AdrsPanelProps) {
    if (adrs.length === 0) return null;

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${THEME.colors.border}`,
                borderRadius: '8px',
                background: THEME.colors.card,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    padding: '10px 12px',
                    borderBottom: `1px solid ${THEME.colors.border}`,
                    background: THEME.colors.backgroundSecondary,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: THEME.colors.foreground,
                }}
            >
                Architecture Decision Records ({adrs.length})
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {adrs.map((adr) => (
                        <AdrLink key={adr} adr={adr} />
                    ))}
                </div>
            </div>
        </div>
    );
}
