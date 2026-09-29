import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import path from 'path';
import AdmZip from 'adm-zip';
import {
    discoverDependencies,
    extractMarkdownReferences,
    extractJsonReferences,
    computeCommonBaseDir,
    runExportCommand,
    ExportManifest,
} from './export';

let tempDir: string;

beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calm-export-'));
});

afterEach(() => {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
});

function write(relativePath: string, content: string): string {
    const filePath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return filePath;
}

function buildSampleProject(): { indexPath: string; architecturePath: string } {
    const architecturePath = write('main-architecture.calm.json', JSON.stringify({
        'unique-id': 'export-example',
        nodes: [
            { 'unique-id': 'api-service', details: { 'building-block': './building-blocks/auth-service.json' } },
        ],
    }));
    write('building-blocks/auth-service.json', JSON.stringify({ 'unique-id': 'auth-service' }));
    write('building-blocks/auth-service.md', '---\nid: auth-service\n---\n# Authentication Service\n');
    write('docs/architecture.md', '# Architecture\n\n![diagram](../images/diagram.png)\n');
    write('images/diagram.png', 'not-a-real-png');
    const indexPath = write('index.md', `---
id: export-example
calm-file: ./main-architecture.calm.json
---

# Export Example

See [architecture docs](./docs/architecture.md).
`);
    return { indexPath, architecturePath };
}

describe('extractMarkdownReferences', () => {
    it('extracts front matter calm-file references', () => {
        const refs = extractMarkdownReferences('---\ncalm-file: ./main-architecture.calm.json\n---\nbody');
        expect(refs).toContain('./main-architecture.calm.json');
    });

    it('extracts calm-file lists and explicit artifact paths', () => {
        const content = `---
calm-file:
    - business-context.calm.json
    - business-context.md
artifacts:
    - type: business-requirements
    - path: business-requirements.md
    - type: images
    - path: images/architecture.png
---
body`;

        expect(extractMarkdownReferences(content)).toEqual([
            'business-context.calm.json',
            'business-context.md',
            'business-requirements.md',
            'images/architecture.png',
        ]);
    });

    it('extracts markdown link and image targets, ignoring remote/anchor links', () => {
        const content = '[docs](./docs/architecture.md) ![img](../images/diagram.png) [external](https://example.com/x.md) [protocol](//cdn.example.com/x.png) [anchor](#section)';
        const refs = extractMarkdownReferences(content);
        expect(refs).toEqual(['./docs/architecture.md', '../images/diagram.png']);
    });
});

describe('extractJsonReferences', () => {
    it('recursively finds local .json/.md string references and ignores others', () => {
        const refs = extractJsonReferences({
            details: { 'building-block': './building-blocks/auth-service.json' },
            nested: [{ doc: './readme.md' }, { url: 'https://calm.finos.org/release/1.2/meta/calm.json' }],
            unrelated: 'just a string',
        });
        expect(refs).toEqual(['./building-blocks/auth-service.json', './readme.md']);
    });
});

describe('computeCommonBaseDir', () => {
    it('finds the deepest common ancestor directory', () => {
        const base = computeCommonBaseDir([
            '/a/b/c/one.json',
            '/a/b/d/two.md',
        ]);
        expect(base).toBe('/a/b');
    });
});

describe('discoverDependencies', () => {
    it('recursively discovers all files reachable from index.md', () => {
        const { indexPath } = buildSampleProject();
        const discovered = discoverDependencies(indexPath);
        const names = discovered.files.map((p) => path.relative(tempDir, p)).sort();

        expect(names).toEqual([
            'building-blocks/auth-service.json',
            'building-blocks/auth-service.md',
            'docs/architecture.md',
            'images/diagram.png',
            'index.md',
            'main-architecture.calm.json',
        ]);
        expect(discovered.files).toHaveLength(6);
    });

    it('does not loop forever on circular references', () => {
        const a = write('a.md', '[b](./b.md)');
        write('b.md', '[a](./a.md)');
        const discovered = discoverDependencies(a);
        expect(discovered.files.length).toBe(2);
    });

    it('warns when a declared artifact is missing', () => {
        const indexPath = write('index.md', `---
artifacts:
  - type: samples
    path: samples/missing-file.calm.json
---
`);
        const warn = vi.fn();
        const logger = { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn(), log: vi.fn() };

        const discovered = discoverDependencies(indexPath, logger);

        expect(discovered.files).toEqual([indexPath]);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('samples/missing-file.calm.json'));
    });

    it('rejects absolute references to prevent arbitrary file disclosure', () => {
        const indexPath = write('index.md', '[secret](/etc/passwd)');
        const warn = vi.fn();
        const logger = { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn(), log: vi.fn() };

        const discovered = discoverDependencies(indexPath, logger);

        expect(discovered.files).toEqual([indexPath]);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipping absolute reference'));
    });

    it('rejects paths escaping project root (path traversal)', () => {
        const indexPath = write('index.md', '[secret](../../etc/passwd)');
        const warn = vi.fn();
        const logger = { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn(), log: vi.fn() };

        const discovered = discoverDependencies(indexPath, logger);

        expect(discovered.files).toEqual([indexPath]);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipping path escaping project root'));
    });

    it('skips symlinks pointing outside project root', () => {
        // Create a directory outside the tempDir (project root) to hold the secret file
        // Use mkdtempSync for secure temporary directory creation
        const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calm-export-outside-'));
        const secretFile = path.join(outsideDir, 'secret.txt');
        fs.writeFileSync(secretFile, 'secret');
        const symlinkPath = path.join(tempDir, 'secret-link.md');
        fs.symlinkSync(secretFile, symlinkPath);

        // Reference the symlink from index.md so it gets discovered
        const indexPath = write('index.md', '[secret](./secret-link.md)');

        const warn = vi.fn();
        const logger = { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn(), log: vi.fn() };

        const discovered = discoverDependencies(indexPath, logger);

        // Only index.md should be included, not the symlink
        expect(discovered.files).toEqual([indexPath]);
        // Symlink is caught by path escaping check since it resolves outside project root
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipping'));

        fs.unlinkSync(symlinkPath);
        fs.unlinkSync(secretFile);
        fs.rmdirSync(outsideDir);
    });

});

describe('runExportCommand', () => {
    it('bundles all discovered files into a zip with a sha256 manifest and no absolute paths', async () => {
        const { indexPath } = buildSampleProject();
        const outputPath = path.join(tempDir, 'out', 'export.zip');

        await runExportCommand({ entryPath: indexPath, outputPath, verbose: false });

        expect(fs.existsSync(outputPath)).toBe(true);
        const zip = new AdmZip(outputPath);
        const entryNames = zip.getEntries().map((e) => e.entryName).sort();

        expect(entryNames).toEqual([
            'building-blocks/auth-service.json',
            'building-blocks/auth-service.md',
            'docs/architecture.md',
            'images/diagram.png',
            'index.md',
            'main-architecture.calm.json',
            'manifest.json',
        ]);

        // No absolute path from this machine should be recorded in the archive.
        for (const name of entryNames) {
            expect(path.isAbsolute(name)).toBe(false);
            expect(name.includes(tempDir)).toBe(false);
        }

        const manifest: ExportManifest = JSON.parse(zip.readAsText('manifest.json'));
        expect(manifest.fileCount).toBe(6);
        expect(manifest.entryPoint).toBe('index.md');
        for (const file of manifest.files) {
            expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
            expect(file.size).toBeGreaterThan(0);
        }
    });

    it('exits with an error when the entry file does not exist', async () => {
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit called');
        });

        await expect(runExportCommand({
            entryPath: path.join(tempDir, 'missing.md'),
            outputPath: path.join(tempDir, 'export.zip'),
            verbose: false,
        })).rejects.toThrow('process.exit called');

        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects output path that would overwrite a discovered file', async () => {
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit called');
        });
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { indexPath } = buildSampleProject();
        // Try to output to a path that is also a discovered file
        const outputPath = path.join(tempDir, 'index.md');

        await expect(runExportCommand({
            entryPath: indexPath,
            outputPath,
            verbose: false,
        })).rejects.toThrow('process.exit called');

        expect(exitSpy).toHaveBeenCalledWith(1);

        exitSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
