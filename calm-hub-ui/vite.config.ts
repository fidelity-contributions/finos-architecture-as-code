/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const ADR_FILE_THRESHOLD = { lines: 80, functions: 80, branches: 80, statements: 80 };

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        dedupe: ['d3-selection', 'd3-transition', 'd3-zoom', 'd3-drag'],
    },
    optimizeDeps: {
        include: ['reactflow'],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        environmentMatchGlobs: [['./src/**/*.tsx', 'jsdom']],
        setupFiles: ['./vitest.setup.ts'],
        coverage: {
            provider: 'v8',
            // Per-file gates on the ADR support code only. A flat workspace gate
            // would sit within a fraction of a percent of the current baseline.
            thresholds: {
                '**/src/visualizer/components/reactflow/AdrsPanel.tsx': ADR_FILE_THRESHOLD,
                '**/src/visualizer/components/reactflow/AdrLink.tsx': ADR_FILE_THRESHOLD,
                '**/src/visualizer/components/reactflow/adr-utils.ts': ADR_FILE_THRESHOLD,
                '**/src/hub/components/control-detail-section/ControlDetailSection.tsx': ADR_FILE_THRESHOLD,
                '**/src/visualizer/components/reactflow/controls-panel/ControlRequirementItem.tsx': ADR_FILE_THRESHOLD,
                '**/src/visualizer/components/reactflow/controls-panel/ControlComplianceStatus.tsx': ADR_FILE_THRESHOLD,
            },
        },
    },
    build: {
        outDir: 'build',
    },
    server: {
        proxy: {
            '/api/calm': 'http://localhost:8080',
            '/calm': 'http://localhost:8080',
        },
    },
});
