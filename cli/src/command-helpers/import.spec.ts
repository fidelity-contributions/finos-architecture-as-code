import AdmZip from 'adm-zip';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertSafeEntryPath, getImportDestination, runImportCommand } from './import';

let tempDir: string;

beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calm-import-'));
});

afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
});

function createArchive(name = 'architecture-export.zip'): string {
    const archivePath = path.join(tempDir, name);
    const archive = new AdmZip();
    archive.addFile('index.md', Buffer.from('# Index'));
    archive.addFile('docs/architecture.md', Buffer.from('# Architecture'));
    archive.addFile('manifest.json', Buffer.from('{"fileCount":2}'));
    archive.writeZip(archivePath);
    return archivePath;
}

describe('getImportDestination', () => {
    it('uses the archive directory and archive name by default', () => {
        expect(getImportDestination('/tmp/architecture-export.zip')).toBe('/tmp/architecture-export');
    });

    it('uses the supplied parent directory and preserves the archive name', () => {
        expect(getImportDestination('/tmp/architecture-export.zip', '/tmp/imports')).toBe('/tmp/imports/architecture-export');
    });

    it('rejects archive names that produce empty directory names', () => {
        expect(() => getImportDestination('/tmp/.zip')).toThrow('Import archive name must produce a valid destination directory');
    });

    it('rejects archive names that produce dot directory names', () => {
        expect(() => getImportDestination('/tmp/..zip')).toThrow('Import archive name must produce a valid destination directory');
    });
});

describe('runImportCommand', () => {
    it('extracts the archive into a folder named after the zip', () => {
        const archivePath = createArchive();

        const result = runImportCommand({ inputPath: archivePath, verbose: false });

        expect(result.fileCount).toBe(3);
        expect(result.destinationPath).toBe(path.join(tempDir, 'architecture-export'));
        expect(fs.readFileSync(path.join(result.destinationPath, 'index.md'), 'utf8')).toBe('# Index');
        expect(fs.readFileSync(path.join(result.destinationPath, 'docs', 'architecture.md'), 'utf8')).toBe('# Architecture');
    });

    it('extracts under a supplied parent directory while preserving the zip name', () => {
        const archivePath = createArchive('bundle.zip');
        const outputDir = path.join(tempDir, 'imports');

        const result = runImportCommand({ inputPath: archivePath, outputDir, verbose: false });

        expect(result.destinationPath).toBe(path.join(outputDir, 'bundle'));
        expect(fs.existsSync(path.join(outputDir, 'bundle', 'manifest.json'))).toBe(true);
    });

    it('rejects path traversal entries before extracting', () => {
        expect(() => assertSafeEntryPath('../outside.txt')).toThrow('Unsafe ZIP entry path');
        expect(() => assertSafeEntryPath('/outside.txt')).toThrow('Unsafe ZIP entry path');
    });

    it('rejects Windows drive-relative paths', () => {
        // C:outside.txt is drive-relative, not absolute, but still unsafe
        expect(() => assertSafeEntryPath('C:outside.txt')).toThrow('Unsafe ZIP entry path');
        expect(() => assertSafeEntryPath('D:file.txt')).toThrow('Unsafe ZIP entry path');
        // C:/path is absolute and should also be rejected
        expect(() => assertSafeEntryPath('C:/outside.txt')).toThrow('Unsafe ZIP entry path');
    });

    it('rejects extraction when a destination directory is a symlink to another location', () => {
        const archivePath = createArchive('symlink.zip');
        const destinationPath = path.join(tempDir, 'imports', 'symlink');
        const outsideDir = path.join(tempDir, 'outside');

        fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
        fs.mkdirSync(destinationPath, { recursive: true });
        fs.mkdirSync(outsideDir, { recursive: true });
        fs.symlinkSync(outsideDir, path.join(destinationPath, 'docs'), 'dir');

        const archive = new AdmZip();
        archive.addFile('docs/file.txt', Buffer.from('secret'));
        archive.writeZip(archivePath);

        expect(() => runImportCommand({ inputPath: archivePath, outputDir: path.join(tempDir, 'imports'), verbose: false }))
            .toThrow('Unsafe ZIP entry path');
    });

    it('rejects extraction when the destination itself is a symlink', () => {
        const archivePath = createArchive('symlink-dest.zip');
        const importsDir = path.join(tempDir, 'imports');
        const destinationPath = path.join(importsDir, 'symlink-dest');
        const outsideDir = path.join(tempDir, 'outside');

        fs.mkdirSync(importsDir, { recursive: true });
        fs.mkdirSync(outsideDir, { recursive: true });
        // Make the destination itself a symlink to outside
        fs.symlinkSync(outsideDir, destinationPath, 'dir');

        expect(() => runImportCommand({ inputPath: archivePath, outputDir: importsDir, verbose: false }))
            .toThrow('Unsafe ZIP extraction destination');
    });
});
