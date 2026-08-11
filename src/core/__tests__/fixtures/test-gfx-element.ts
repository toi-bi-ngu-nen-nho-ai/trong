import type { SerializedXYWH } from '@blocksuite/global/gfx';
import * as Y from 'yjs';

import {
  type BaseElementProps,
  canSafeAddToContainer,
  convert,
  derive,
  field,
  GfxGroupLikeElementModel,
  type GfxModel,
  GfxLocalElementModel,
  GfxPrimitiveElementModel,
  observe,
} from '../../gfx';

export class TestShapeElement extends GfxPrimitiveElementModel {
  get type() {
    return 'testShape';
  }

  @field()
  accessor rotate: number = 0;

  @field()
  accessor xywh: SerializedXYWH = '[0,0,10,10]';

  @convert(val => {
    if (['rect', 'triangle'].includes(val)) {
      return val;
    }

    return 'rect';
  })
  @derive(val => {
    if (val === 'triangle') {
      return {
        rotate: 0,
      };
    }

    return {};
  })
  @field()
  accessor shapeType: 'rect' | 'triangle' = 'rect';
}

export class TestLocalElement extends GfxLocalElementModel {
  override type: string = 'testLocal';
}

// Fixture cho GfxGroupLikeElementModel — lớp cơ sở của MindmapElementModel (D7).
// Thượng nguồn không có test nào chạy qua lớp này, mà P1.1 lại dựng mindmap thẳng lên nó.
// Khuôn theo đúng `GroupElementModel` ở
// AFFiNE/blocksuite/affine/model/src/elements/group/group.ts: field `children` là
// `Y.Map<boolean>`, và `@observe` gọi `setChildIds` mỗi khi `Y.Map` con đổi — đây chính là cơ
// chế mindmap dựa vào để phản ứng khi node được thêm/xoá.
type TestGroupElementProps = BaseElementProps & {
  children: Y.Map<boolean>;
};

export class TestGroupElement extends GfxGroupLikeElementModel<TestGroupElementProps> {
  get rotate() {
    return 0;
  }

  set rotate(_: number) {}

  get type() {
    return 'testGroup';
  }

  override addChild(element: GfxModel) {
    this.addChildren([element]);
  }

  addChildren(elements: GfxModel[]) {
    elements = [...new Set(elements)].filter(element =>
      canSafeAddToContainer(this, element)
    );
    if (elements.length === 0) {
      return;
    }

    this.surface.store.transact(() => {
      elements.forEach(element => {
        this.children.set(element.id, true);
      });
    });
  }

  removeChild(element: GfxModel) {
    this.removeChildren([element]);
  }

  removeChildren(elements: GfxModel[]) {
    if (!this.children) {
      return;
    }
    const childIds = [...new Set(elements.map(element => element.id))];
    if (childIds.length === 0) {
      return;
    }

    this.surface.store.transact(() => {
      childIds.forEach(childId => {
        this.children.delete(childId);
      });
    });
  }

  @observe(
    (
      _,
      instance: GfxGroupLikeElementModel<TestGroupElementProps>,
      transaction
    ) => {
      if (instance.children.doc) {
        instance.setChildIds(
          Array.from(instance.children.keys()),
          transaction?.local ?? false
        );
      }
    }
  )
  @field()
  accessor children: Y.Map<boolean> = new Y.Map();
}
