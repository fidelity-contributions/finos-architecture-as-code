import { FiExternalLink, FiFileText } from 'react-icons/fi';
import { THEME } from './theme.js';
import { getAdrDisplayName, isCalmHubAdr, toAdrAppRoute } from './adr-utils.js';

/**
 * One ADR reference. A CALM Hub reference opens in the app; anything else opens
 * in a new tab.
 */
export function AdrLink({ adr }: { adr: string }) {
    const isInternal = isCalmHubAdr(adr);
    const Icon = isInternal ? FiFileText : FiExternalLink;

    return (
        <a
            href={isInternal ? `#${toAdrAppRoute(adr)}` : adr}
            {...(isInternal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
            onClick={(e) => e.stopPropagation()}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${THEME.colors.border}`,
                background: THEME.colors.card,
                color: THEME.colors.accentText,
                textDecoration: 'none',
                fontSize: '13px',
                transition: 'background 0.15s',
                cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = THEME.colors.backgroundSecondary;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = THEME.colors.card;
            }}
        >
            <Icon style={{ flexShrink: 0, width: '16px', height: '16px' }} />
            <span
                style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={adr}
            >
                {getAdrDisplayName(adr)}
            </span>
        </a>
    );
}
