import type { GfxGroupCompatibleInterface } from './base';
import type { GfxBlockElementModel } from './gfx-block-model';
import {
  type GfxGroupLikeElementModel,
  GfxPrimitiveElementModel,
} from './surface/element-model';

export type GfxModel = GfxBlockElementModel | GfxPrimitiveElementModel;

export type GfxGroupModel =
  | (GfxGroupCompatibleInterface & GfxBlockElementModel)
  | GfxGroupLikeElementModel;

export const isPrimitiveModel = (
  model: GfxModel
): model is GfxPrimitiveElementModel => {
  return model instanceof GfxPrimitiveElementModel;
};
