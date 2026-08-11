import type { IdGenerator } from '../utils/id-generator';

export * from './test-doc';
export * from './test-meta';
export * from './test-workspace';

export function createAutoIncrementIdGenerator(): IdGenerator {
  let i = 0;
  return () => (i++).toString();
}
