import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import { initLogger } from '@finos/calm-shared';

export interface ImportCommandOptions {
    inputPath: string;
    outputDir?: string;
    verbose: boolean;
}

export interface ImportResult {
    archivePath: string;
    destinationPath: string;
    fileCount: number;
}

function archiveDirectoryName(archivePath: string): string {
    const name = path.basename(archivePath);
    return name.toLowerCase().endsWith('.zip') ? name.slice(0, -4) : name;
}

export function getImportDestination(inputPath: string, outputDir?: string): string {
    const archivePath = path.resolve(inputPath);
    const parent = outputDir ? path.resolve(outputDir) : path.dirname(archivePath);
    const directoryName = archiveDirectoryName(archivePath);
    if (!directoryName || directoryName === '.' || directoryName === '..') {
        throw new Error(`Import archive name must produce a valid destination directory: ${path.basename(archivePath)}`);
    }
    return path.join(parent, directoryName);
}

export function assertSafeEntryPath(entryName: string): void {
    const normalized = entryName.replaceAll('\\', '/');
    if (!normalized || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
        throw new Error(`Unsafe ZIP entry path: ${entryName}`);
    }

    const segments = normalized.split('/');
    if (segments.some((segment) => segment === '..')) {
        throw new Error(`Unsafe ZIP entry path: ${entryName}`);
    }
}

function assertNoSymlinksOutsideDestination(destination: string, entryName: string): void {
    const normalized = entryName.replaceAll('\\', '/');
    // Security: Reject if destination itself is a symlink before resolving
    if (fs.existsSync(destination) && fs.lstatSync(destination).isSymbolicLink()) {
        throw new Error(`Unsafe ZIP extraction destination: ${destination} is a symlink`);
    }
    const destinationRoot = fs.existsSync(destination) ? fs.realpathSync(destination) : path.resolve(destination);
    let cursor = destinationRoot;

    for (const segment of normalized.split('/').filter(Boolean)) {
        cursor = path.join(cursor, segment);
        if (!fs.existsSync(cursor)) {
            continue;
        }

        const stat = fs.lstatSync(cursor);
        if (stat.isSymbolicLink()) {
            throw new Error(`Unsafe ZIP entry path: ${entryName} (destination contains a symlink)`);
        }

        const realPath = fs.realpathSync(cursor);
        const relative = path.relative(destinationRoot, realPath);
        if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
            throw new Error(`Unsafe ZIP entry path: ${entryName} (destination contains a symlink outside the import tree)`);
        }
    }
}

function ensureWithinDestination(destination: string, entryName: string): string {
    const normalized = entryName.replaceAll('\\', '/');
    const target = path.resolve(destination, ...normalized.split('/'));
    const relative = path.relative(destination, target);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error(`Unsafe ZIP entry path: ${entryName}`);
    }
    assertNoSymlinksOutsideDestination(destination, entryName);
    return target;
}

export function runImportCommand(options: ImportCommandOptions): ImportResult {
    const logger = initLogger(options.verbose, 'calm-import');
    const archivePath = path.resolve(options.inputPath);

    if (!fs.existsSync(archivePath) || !fs.statSync(archivePath).isFile()) {
        throw new Error(`Import archive not found: ${options.inputPath}`);
    }
    if (!archivePath.toLowerCase().endsWith('.zip')) {
        throw new Error(`Import input must be a .zip file: ${options.inputPath}`);
    }

    const destinationPath = getImportDestination(archivePath, options.outputDir);
    const archive = new AdmZip(archivePath);
    const entries = archive.getEntries();

    for (const entry of entries) {
        assertSafeEntryPath(entry.entryName);
        ensureWithinDestination(destinationPath, entry.entryName);
    }

    fs.mkdirSync(destinationPath, { recursive: true });
    let fileCount = 0;
    for (const entry of entries) {
        if (entry.isDirectory) {
            fs.mkdirSync(ensureWithinDestination(destinationPath, entry.entryName), { recursive: true });
            continue;
        }
        const target = ensureWithinDestination(destinationPath, entry.entryName);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, entry.getData());
        fileCount += 1;
        logger.debug(`Imported ${entry.entryName}`);
    }

    logger.info(`Imported ${fileCount} file(s) to ${destinationPath}`);
    return { archivePath, destinationPath, fileCount };
}
