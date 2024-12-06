import { beginCell, Cell } from '@ton/core'
import { Buffer } from 'buffer'
import { Asset } from '../types/assets/assets'

/**
 * For every `breakpoint` number of coins, store them in a nested cell
 * @param sorted sorted array of bigint, the order should follow the same order as the nested asset cell
 * @returns nested coin cell
 */
export const toNestedCoinCell = (
  sorted: bigint[],
  breakpoint: number = 7,
): Cell => {
  const builder = beginCell()
  while (sorted.length > 0) {
    const value = sorted[0]
    sorted = sorted.slice(1) // pop first element

    if (sorted.length % breakpoint === 0 && sorted.length > 0) {
      builder.storeRef(toNestedCoinCell(sorted))
    } else {
      builder.storeCoins(value)
    }
  }

  return builder.endCell()
}

export const toNestedAssetCell = (sorted: Asset[]): Cell => {
  const builder = beginCell()

  while (sorted.length > 0) {
    const asset = sorted[0]
    sorted = sorted.slice(1) // pop first element

    if (sorted.length % 4 === 0 && sorted.length > 0) {
      builder.storeRef(toNestedAssetCell(sorted))
    } else {
      builder.storeRef(asset.toCell())
    }
  }

  return builder.endCell()
}

export const fromNestedAssetCell = (c: Cell): Asset[] => {
  const depth = c.depth()
  const sc = c.beginParse()
  const items: Asset[] = []

  for (let d = 0; d < depth; d++) {
    if (d !== 0) {
      sc.loadRef()
    }
    const refs = Math.min(sc.remainingRefs, 4)
    for (let i = 0; i < refs; i++) {
      items.push(Asset.fromCell(sc.loadRef()))
    }
  }
  return items
}

export const fromNestedCoinCell = (c: Cell): bigint[] => {
  let sc = c.beginParse()
  const items: bigint[] = []

  do {
    while (sc.remainingBits > 0) {
      items.push(sc.loadCoins())
    }

    if (sc.remainingRefs > 0) {
      sc = sc.loadRef().beginParse()
    }
  } while (sc.remainingBits > 0)
  return items
}

export const parseStateData = (state: Buffer): Cell => {
  return Cell.fromBase64(state.toString('base64'))
}
