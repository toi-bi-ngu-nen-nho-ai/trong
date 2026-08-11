// Cưỡng chế hợp đồng mà quyết định "khai lại LifeCycleWatcherIdentifier ở nhà" dựa vào.
//
// P0-C khai `LifeCycleWatcherIdentifier` trong `src/core/gfx/std-identifier.ts` thay vì port
// 3.260 dòng hạ tầng `std/`. Việc đó chỉ an toàn nếu DI định danh dịch vụ bằng **chuỗi tên**,
// không bằng đồng nhất đối tượng — nếu sai, khi P1.0 port `std/src/identifier.ts` thật sẽ có hai
// định danh song song chia đôi container, và lỗi đó sẽ hiện ra ở tầng chạy chứ không ở `tsc`.
//
// Ca dưới đây đóng vai bản std tương lai: khai một định danh **độc lập hoàn toàn** cùng tên rồi
// kiểm hai chiều đọc/ghi bắc cầu được qua nhau. Nếu ai đó đổi cách khoá của container, ca này đỏ.

import { Container, createIdentifier } from '@blocksuite/global/di';
import { describe, expect, it } from 'vitest';

import {
  type LifeCycleWatcher,
  LifeCycleWatcherIdentifier,
} from '../gfx/std-identifier';

// Đóng vai `std/src/identifier.ts` sau khi P1.0 port thật: cùng tên, khác đối tượng.
const StdSideIdentifier = createIdentifier<LifeCycleWatcher>('LifeCycleWatcher');

describe('LifeCycleWatcherIdentifier khai lại ở tầng port', () => {
  it('không cùng đối tượng với bản khai độc lập', () => {
    expect(LifeCycleWatcherIdentifier).not.toBe(StdSideIdentifier);
  });

  it('ghi bằng bản port, đọc được bằng bản std', () => {
    const di = new Container();
    const watcher = {} as LifeCycleWatcher;

    di.addImpl(LifeCycleWatcherIdentifier, () => watcher);

    expect(di.provider().get(StdSideIdentifier)).toBe(watcher);
  });

  it('ghi bằng bản std, đọc được bằng bản port', () => {
    const di = new Container();
    const watcher = {} as LifeCycleWatcher;

    di.addImpl(StdSideIdentifier, () => watcher);

    expect(di.provider().get(LifeCycleWatcherIdentifier)).toBe(watcher);
  });

  it('bắc cầu cả ở dạng biến thể — dạng mà gfx/identifiers.ts dùng', () => {
    // `gfx/identifiers.ts` gọi `LifeCycleWatcherIdentifier(gfxControllerKey)`.
    const gfxControllerKey = 'GfxController';
    const di = new Container();
    const controller = {} as LifeCycleWatcher;

    di.addImpl(LifeCycleWatcherIdentifier(gfxControllerKey), () => controller);

    expect(di.provider().get(StdSideIdentifier(gfxControllerKey))).toBe(
      controller
    );
  });

  it('biến thể khác nhau vẫn là ô khác nhau', () => {
    const di = new Container();
    const a = {} as LifeCycleWatcher;

    di.addImpl(LifeCycleWatcherIdentifier('GfxController'), () => a);

    expect(() =>
      di.provider().get(StdSideIdentifier('KhongCoAi'))
    ).toThrowError();
  });
});
