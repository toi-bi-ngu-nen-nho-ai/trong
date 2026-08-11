import {
  createAutoIncrementIdGenerator,
  TestWorkspace,
} from '@blocksuite/store/test';
import { describe, expect, test } from 'vitest';

import type {
  TestGroupElement,
  TestShapeElement,
} from './fixtures/test-gfx-element';
import {
  RootBlockSchemaExtension,
  type SurfaceBlockModel,
  SurfaceBlockSchemaExtension,
} from './fixtures/test-schema';

// Cùng khuôn dựng TestWorkspace/doc/surface như `surface.spec.ts` — xem hàm `commonSetup` ở đó.

const extensions = [RootBlockSchemaExtension, SurfaceBlockSchemaExtension];

function createTestOptions() {
  const idGenerator = createAutoIncrementIdGenerator();
  return { id: 'test-collection', idGenerator };
}

const commonSetup = () => {
  const collection = new TestWorkspace(createTestOptions());

  collection.meta.initialize();
  const doc = collection.createDoc('home');
  const store = doc.getStore({ extensions });
  doc.load();

  const rootId = store.addBlock('test:page');
  const surfaceId = store.addBlock('test:surface', {}, rootId);

  const surfaceBlock = store.getBlock(surfaceId)!;

  return {
    surfaceId,
    surfaceModel: surfaceBlock.model as SurfaceBlockModel,
  };
};

describe('GfxGroupLikeElementModel', () => {
  test('addChild / removeChild should update childIds', () => {
    const { surfaceModel: model } = commonSetup();

    const shapeId = model.addElement({ type: 'testShape' });
    const groupId = model.addElement({ type: 'testGroup' });

    const shape = model.getElementById(shapeId)! as TestShapeElement;
    const group = model.getElementById(groupId)! as TestGroupElement;

    group.addChild(shape);
    expect(group.childIds).toEqual([shapeId]);

    group.removeChild(shape);
    expect(group.childIds).toEqual([]);
  });

  test('@observe on children should fire when the underlying Y.Map mutates directly', () => {
    const { surfaceModel: model } = commonSetup();

    const shapeId = model.addElement({ type: 'testShape' });
    const groupId = model.addElement({ type: 'testGroup' });

    const shape = model.getElementById(shapeId)! as TestShapeElement;
    const group = model.getElementById(groupId)! as TestGroupElement;

    // Mutate the Y.Map directly instead of going through `addChild` — this is the path
    // mindmap's own node-editing code takes (e.g. remote sync, or code that sets node detail
    // on `children` without calling a convenience method). If `@observe` only fired for calls
    // routed through `addChild`, this would fail to update `childIds`.
    model.store.transact(() => {
      group.children.set(shapeId, true);
    });

    expect(group.childIds).toEqual([shapeId]);
    expect(group.childElements).toEqual([shape]);
    expect(group.hasChild(shape)).toBe(true);

    model.store.transact(() => {
      group.children.delete(shapeId);
    });

    expect(group.childIds).toEqual([]);
    expect(group.hasChild(shape)).toBe(false);
  });

  test('xywh of the group should be computed from the union of its children, and update when a child moves', () => {
    const { surfaceModel: model } = commonSetup();

    const shapeAId = model.addElement({
      type: 'testShape',
      xywh: '[0,0,10,10]',
    });
    const shapeBId = model.addElement({
      type: 'testShape',
      xywh: '[100,100,10,10]',
    });
    const groupId = model.addElement({ type: 'testGroup' });

    const shapeA = model.getElementById(shapeAId)! as TestShapeElement;
    const shapeB = model.getElementById(shapeBId)! as TestShapeElement;
    const group = model.getElementById(groupId)! as TestGroupElement;

    group.addChild(shapeA);
    group.addChild(shapeB);

    // Union of [0,0,10,10] and [100,100,10,10] is [0,0,110,110].
    expect(group.xywh).toBe('[0,0,110,110]');

    model.updateElement(shapeBId, { xywh: '[200,200,10,10]' });

    // The bound must widen to keep covering the moved child.
    expect(group.xywh).toBe('[0,0,210,210]');
  });

  test('descendantElements should return the full tree when groups are nested inside groups', () => {
    const { surfaceModel: model } = commonSetup();

    const shapeId = model.addElement({ type: 'testShape' });
    const innerGroupId = model.addElement({ type: 'testGroup' });
    const outerGroupId = model.addElement({ type: 'testGroup' });

    const shape = model.getElementById(shapeId)! as TestShapeElement;
    const innerGroup = model.getElementById(innerGroupId)! as TestGroupElement;
    const outerGroup = model.getElementById(outerGroupId)! as TestGroupElement;

    innerGroup.addChild(shape);
    outerGroup.addChild(innerGroup);

    expect(new Set(outerGroup.descendantElements)).toEqual(
      new Set([innerGroup, shape])
    );
    expect(outerGroup.hasDescendant(shape)).toBe(true);
  });
});
