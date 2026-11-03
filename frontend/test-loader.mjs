import esbuild from 'esbuild';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  // Try standard resolution first
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      // If it is a relative import without extension, try appending .jsx, .js, .json
      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        const parentDir = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
        const basePath = new URL(specifier, context.parentURL).pathname;
        for (const ext of ['.jsx', '.js', '.json']) {
          if (fs.existsSync(basePath + ext)) {
            return {
              shortCircuit: true,
              url: pathToFileURL(basePath + ext).href,
            };
          }
        }
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.jsx')) {
    const filePath = fileURLToPath(url);
    const rawSource = fs.readFileSync(filePath, 'utf8');
    const { code } = esbuild.transformSync(rawSource, {
      loader: 'jsx',
      jsx: 'automatic',
      sourcefile: filePath,
    });
    return {
      format: 'module',
      shortCircuit: true,
      source: code,
    };
  }
  return nextLoad(url, context);
}
