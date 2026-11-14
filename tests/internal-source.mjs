import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const raiz = process.env.CMAPP_INTERNAL_ROOT
  ? pathToFileURL(resolve(process.env.CMAPP_INTERNAL_ROOT) + '/')
  : new URL('../../cm-app-v1.13.9-internal/', import.meta.url);
export const internalFile = path => new URL(path, raiz);
