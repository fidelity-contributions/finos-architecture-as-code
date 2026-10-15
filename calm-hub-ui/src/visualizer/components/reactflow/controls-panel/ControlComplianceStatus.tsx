import { controlStatus } from '@finos/calm-models/model';
import type { CalmControlStatusSchema } from '@finos/calm-models/types';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { THEME } from '../theme.js';
import { AdrLink } from '../AdrLink.js';

interface ControlComplianceStatusProps {
    status?: CalmControlStatusSchema;
    adrs?: string[];
}

/**
 * Compliance badge for one control requirement, with the ADRs that justify it.
 * An absent status is `compliant`.
 */
export function ControlComplianceStatus({ status, adrs = [] }: ControlComplianceStatusProps) {
    const resolved = controlStatus({ status });
    const compliant = resolved === 'compliant';
    const color = compliant ? THEME.colors.success : THEME.colors.error;
    const Icon = compliant ? FiCheckCircle : FiAlertTriangle;

    return (
        <div style={{ marginBottom: '6px' }}>
            <span
                data-testid="control-status-badge"
                data-status={resolved}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: `1px solid ${color}`,
                    background: `${color}15`,
                    color,
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                }}
            >
                <Icon style={{ width: '11px', height: '11px' }} />
                {resolved}
            </span>

            {adrs.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: THEME.colors.muted, marginBottom: '4px' }}>
                        ADRs:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {adrs.map((adr) => (
                            <AdrLink key={adr} adr={adr} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
