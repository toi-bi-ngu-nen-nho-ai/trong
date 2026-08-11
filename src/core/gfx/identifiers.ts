import type { ServiceIdentifier } from '@blocksuite/global/di';

import { LifeCycleWatcherIdentifier } from './std-identifier';
import type { GfxController } from './host';

export const gfxControllerKey = 'GfxController';

export const GfxControllerIdentifier = LifeCycleWatcherIdentifier(
  gfxControllerKey
) as ServiceIdentifier<GfxController>;
