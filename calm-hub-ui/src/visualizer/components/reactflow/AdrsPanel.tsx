import { THEME } from './theme.js';
import type { AdrsPanelProps, ElementAdrs } from '../../contracts/contracts.js';
import { AdrLink } from './AdrLink.js';

interface AdrSection {
    key: string;
    title: string;
    adrs: string[];
}

function elementTitle(element: ElementAdrs): string {
    return `${element.kind === 'node' ? 'Node' : 'Relationship'}: ${element.name}`;
}

/**
 * A selected element's ADRs come first, then the architecture's. With no selection,
 * every element that carries ADRs is listed after the architecture's own.
 */
function buildSections(adrs: string[], elementAdrs: ElementAdrs[], selectedElementId?: string): AdrSection[] {
    const architecture: AdrSection = { key: 'architecture', title: 'Architecture', adrs };
    const toSection = (element: ElementAdrs): AdrSection => ({
        key: `${element.kind}:${element.id}`,
        title: elementTitle(element),
        adrs: element.adrs,
    });

    const selected = selectedElementId ? elementAdrs.find((e) => e.id === selectedElementId) : undefined;
    const sections = selected
        ? [toSection(selected), architecture]
        : [architecture, ...elementAdrs.map(toSection)];
    return sections.filter((section) => section.adrs.length > 0);
}

export function AdrsPanel({ adrs, elementAdrs = [], selectedElementId }: AdrsPanelProps) {
    const sections = buildSections(adrs, elementAdrs, selectedElementId);
    if (sections.length === 0) return null;

    const total = sections.reduce((count, section) => count + section.adrs.length, 0);
    const showSectionTitles = sections.length > 1 || sections[0].key !== 'architecture';

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
                Architecture Decision Records ({total})
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sections.map((section) => (
                        <section key={section.key} aria-label={showSectionTitles ? section.title : undefined}>
                            {showSectionTitles && (
                                <h4
                                    style={{
                                        margin: '0 0 6px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        color: THEME.colors.muted,
                                    }}
                                >
                                    {section.title}
                                </h4>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {section.adrs.map((adr) => (
                                    <AdrLink key={adr} adr={adr} />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
