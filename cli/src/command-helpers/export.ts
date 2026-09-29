import path from 'path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ZipArchive } from 'archiver';
import { initLogger, type Logger } from '@finos/calm-shared';

export interface ExportCommandOptions {
    /** Path to an index.md entry point. */
    entryPath: string;
    /** Path at which to write the resulting zip archive. */
    outputPath: string;
    verbose: boolean;
}

export interface ManifestFileEntry {
    path: string;
    sha256: string;
    size: number;
}

export interface ExportManifest {
    generatedAt: string;
    entryPoint: string;
    fileCount: number;
    files: ManifestFileEntry[];
}

const REFERENCE_EXTENSIONS = /\.(json|md)$/i;

function isRemoteOrAnchorReference(target: string): boolean {
    return !target
        || target.startsWith('#')
        || target.startsWith('mailto:')
        || target.startsWith('//')
        || /^[a-z][a-z0-9+.-]*:\/\//i.test(target);
}

function addMarkdownFileReference(refs: string[], value: string): void {
    const reference = value.trim().replace(/^['"]|['"]$/g, '').replace(/\s+#.*$/, '');
    if (reference && !isRemoteOrAnchorReference(reference)) {
        refs.push(reference);
    }
}

/** Extracts declared artifact files from front matter and local targets from Markdown links/images. */
export function extractMarkdownReferences(content: string): string[] {
    const refs: string[] = [];

    const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (frontMatterMatch) {
        let listKey: string | undefined;
        for (const line of frontMatterMatch[1].split('\n')) {
            if (/^\s*#/.test(line) || !line.trim()) {
                continue;
            }

            const listPath = line.match(/^\s*(?:-\s*)?path:\s*(.+?)\s*$/);
            if (listPath) {
                addMarkdownFileReference(refs, listPath[1]);
                continue;
            }

            const keyValue = line.match(/^\s*([\w-]+):\s*(.*?)\s*$/);
            if (keyValue) {
                listKey = keyValue[1];
                if (listKey === 'calm-file' && keyValue[2]) {
                    keyValue[2].split(',').forEach((value) => addMarkdownFileReference(refs, value));
                }
                continue;
            }

            const listValue = line.match(/^\s*-\s*(.+?)\s*$/);
            if (listKey === 'calm-file' && listValue) {
                addMarkdownFileReference(refs, listValue[1]);
            }
        }
    }

    const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(content)) !== null) {
        const target = match[1].trim().split(/\s+/)[0];
        if (!isRemoteOrAnchorReference(target)) {
            refs.push(target);
        }
    }

    return refs;
}

/** Recursively walks a parsed CALM JSON document, collecting string values that look like local .json/.md references. */
export function extractJsonReferences(node: unknown, refs: string[] = []): string[] {
    if (typeof node === 'string') {
        if (REFERENCE_EXTENSIONS.test(node) && !isRemoteOrAnchorReference(node)) {
            refs.push(node);
        }
    } else if (Array.isArray(node)) {
        node.forEach((child) => extractJsonReferences(child, refs));
    } else if (node && typeof node === 'object') {
        for (const value of Object.values(node as Record<string, unknown>)) {
            extractJsonReferences(value, refs);
        }
    }
    return refs;
}

/** Same-named `.md` companion doc for a building-block/architecture CALM JSON file, if one exists. */
function companionMarkdownFor(jsonFilePath: string): string | undefined {
    const companion = jsonFilePath.replace(/\.json$/i, '.md');
    return fs.existsSync(companion) ? companion : undefined;
}

export interface DiscoveryResult {
    /** Absolute paths of every discovered file. */
    files: string[];
}

/**
 * Starting from `index.md`, recursively discovers every local
 * file reachable through Markdown links/front matter, CALM JSON string references
 * (e.g. `details.building-block`), guarding against circular references.
 *
 * Security: Rejects absolute references and paths escaping the project root
 * to prevent arbitrary file disclosure when exporting untrusted OKF files.
 */
export function discoverDependencies(entryPath: string, logger?: Logger): DiscoveryResult {
    // Security: Resolve project root to handle symlinks (e.g., /tmp -> /private/tmp on macOS)
    const projectRoot = fs.realpathSync(path.resolve(path.dirname(entryPath)));
    const visited = new Set<string>();
    const queue: Array<{ filePath: string; referencedFrom?: string }> = [{ filePath: path.resolve(entryPath) }];

    function isWithinProjectRoot(filePath: string): boolean {
        // For existing files, resolve symlinks; for non-existent paths, normalize
        let resolved: string;
        try {
            resolved = fs.realpathSync(filePath);
        } catch {
            resolved = path.normalize(filePath);
        }
        return resolved === projectRoot || resolved.startsWith(projectRoot + path.sep);
    }

    while (queue.length > 0) {
        const item = queue.shift();
        const current = item?.filePath;
        if (!current || visited.has(current)) {
            continue;
        }
        if (!fs.existsSync(current)) {
            logger?.warn(
                `Could not resolve referenced file "${current}"` +
                (item?.referencedFrom ? ` from "${item.referencedFrom}".` : '.')
            );
            continue;
        }

        // Security: Resolve symlinks and verify the real path stays within project root
        const realCurrent = fs.realpathSync(current);
        if (!isWithinProjectRoot(realCurrent)) {
            logger?.warn(`Skipping file outside project root: "${current}"`);
            continue;
        }

        visited.add(current);
        const dir = path.dirname(current);
        const ext = path.extname(current).toLowerCase();
        let refs: string[] = [];
        if (ext === '.md') {
            refs = extractMarkdownReferences(fs.readFileSync(current, 'utf-8'));
        } else if (ext === '.json') {
            const parsed = JSON.parse(fs.readFileSync(current, 'utf-8'));
            refs = extractJsonReferences(parsed);
            const companion = companionMarkdownFor(current);
            if (companion) {
                // Convert absolute companion path to relative reference
                const relativeCompanion = path.relative(dir, companion);
                refs.push(relativeCompanion);
            }
        }

        for (const ref of refs) {
            // Security: Reject absolute references
            if (path.isAbsolute(ref)) {
                logger?.warn(`Skipping absolute reference: "${ref}" in "${current}"`);
                continue;
            }

            const resolved = path.resolve(dir, ref);

            // Security: Reject paths that escape the project root (e.g., ../../../etc/passwd)
            if (!isWithinProjectRoot(resolved)) {
                logger?.warn(`Skipping path escaping project root: "${ref}" in "${current}"`);
                continue;
            }

            if (!visited.has(resolved)) {
                queue.push({ filePath: resolved, referencedFrom: current });
            }
        }
    }

    return { files: Array.from(visited) };
}

/** Finds the deepest common ancestor directory of a set of absolute file paths. */
export function computeCommonBaseDir(filePaths: string[]): string {
    const segmented = filePaths.map((filePath) => path.dirname(filePath).split(path.sep));
    let common = segmented[0] ?? [];

    for (const segments of segmented.slice(1)) {
        let i = 0;
        while (i < common.length && i < segments.length && common[i] === segments[i]) {
            i++;
        }
        common = common.slice(0, i);
    }

    return common.join(path.sep) || path.sep;
}

function toZipEntryName(baseDir: string, filePath: string): string {
    return path.relative(baseDir, filePath).split(path.sep).join('/');
}

/**
 * Computes the zip entry name for every discovered file relative to their common base
 * directory, keeping the index file at the archive root.
 */
export function computeZipEntryNames(discovery: DiscoveryResult): Map<string, string> {
    const primaryBaseDir = computeCommonBaseDir(discovery.files);

    const entryNames = new Map<string, string>();
    for (const file of discovery.files) {
        entryNames.set(file, toZipEntryName(primaryBaseDir, file));
    }
    return entryNames;
}

/**
 * Bundles a CALM architecture and all of its discoverable OKF documentation,
 * building blocks, and other local assets into a single zip archive. Files are stored
 * relative to their common base directory. No absolute paths from the machine running
 * the export are recorded, and a
 * `manifest.json` recording each file's sha256 hash is added to the archive.
 */
export async function runExportCommand(options: ExportCommandOptions): Promise<void> {
    const logger = initLogger(options.verbose, 'calm-export');
    const entryPath = path.resolve(options.entryPath);

    if (!fs.existsSync(entryPath)) {
        logger.error(`Entry file not found: ${options.entryPath}`);
        process.exit(1);
    }

    try {
        const discovery = discoverDependencies(entryPath, logger);
        const discovered = discovery.files.sort();
        const entryNames = computeZipEntryNames(discovery);

        const outputDir = path.dirname(path.resolve(options.outputPath));
        fs.mkdirSync(outputDir, { recursive: true });

        const resolvedOutputPath = path.resolve(options.outputPath);
        if (discovered.includes(resolvedOutputPath)) {
            throw new Error(`Output archive path must not overwrite a discovered file: ${options.outputPath}`);
        }

        const files: ManifestFileEntry[] = [];
        const output = fs.createWriteStream(resolvedOutputPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });

        const archiveClosed = new Promise<void>((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
        });
        archive.pipe(output);

        for (const filePath of discovered) {
            const entryName = entryNames.get(filePath) as string;
            const content = fs.readFileSync(filePath);
            const sha256 = crypto.createHash('sha256').update(content).digest('hex');
            files.push({ path: entryName, sha256, size: content.length });
            archive.append(content, { name: entryName });
            logger.debug(`Added ${entryName} (${sha256})`);
        }

        const manifest: ExportManifest = {
            generatedAt: new Date().toISOString(),
            entryPoint: entryNames.get(entryPath) as string,
            fileCount: files.length,
            files,
        };
        archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

        await archive.finalize();
        await archiveClosed;

        logger.info(`Exported ${files.length} file(s) to ${options.outputPath}`);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('An error occurred while exporting the CALM architecture: ' + message);
        if (err instanceof Error && err.stack) logger.debug(err.stack);
        process.exit(1);
    }
}
