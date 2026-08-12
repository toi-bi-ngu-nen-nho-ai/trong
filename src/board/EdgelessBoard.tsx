// Toàn bộ phép nhúng nằm ở đây. React giữ một thẻ div; BlockStdScope dựng cây Lit rồi Lit tự
// render vào thẻ đó. React không biết gì về bên trong, Lit không biết gì về React — đó chính là
// điều làm phép nhúng khả thi, và cũng là lý do file này phải nhỏ.
import '@blocksuite/affine/effects'

import { StoreExtensionManager, ViewExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { BlockStdScope } from '@blocksuite/affine/std'
import { createAutoIncrementIdGenerator, TestWorkspace } from '@blocksuite/affine/store/test'
import { render as litRender } from 'lit'
import { useEffect, useRef } from 'react'

import { viewExtensions } from './extensions'

const viewManager = new ViewExtensionManager(viewExtensions)
const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

/**
 * Dựng một bảng trống trong bộ nhớ. Chưa bền vững — lưu trữ (D4) thuộc chặng sau, nên đóng bảng
 * là mất nội dung. `TestWorkspace` là workspace không cần server, đúng thứ cần ở chặng này.
 */
export function taoBangTrong() {
  const workspace = new TestWorkspace({
    id: 'bs-trong-board',
    idGenerator: createAutoIncrementIdGenerator(),
  })
  workspace.meta.initialize()

  const doc = workspace.createDoc('board')
  const store = doc.getStore({ extensions: storeManager.get('store') })
  doc.load()

  const rootId = store.addBlock('affine:page', {})
  store.addBlock('affine:surface', {}, rootId)

  return store
}

export function EdgelessBoard() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const std = new BlockStdScope({
      store: taoBangTrong(),
      extensions: viewManager.get('edgeless'),
    })
    litRender(std.render(), el)

    // Dọn khi React tháo component. Thiếu bước này thì mỗi lần vào ra một bảng là một cây Lit
    // nữa còn sống, giữ nguyên listener và rAF của nó.
    return () => {
      litRender(null, el)
    }
  }, [])

  return <div ref={hostRef} className="absolute inset-0" />
}
