import { Allocation } from '../types/allocation'
import { Asset } from '../types/assets/assets'

/**
 * Normalizes the allocations by ensuring that all assets in the pool are represented,
 * even if their amount is zero. It also sorts the allocations by asset.
 *
 * @param allocations - The current list of allocations.
 * @param assets - The list of assets in the pool.
 * @returns An array of normalized allocations, where each asset is represented.
 */
export const normalizeAllocations = (
  allocations: Allocation[],
  assets: Asset[],
): { normalized: Allocation[] } => {
  const normalized: Allocation[] = []
  assets.forEach((asset) => {
    const existingAlloc = allocations.find((alloc) => alloc.asset.equals(asset))
    if (existingAlloc) {
      normalized.push(existingAlloc)
    } else {
      normalized.push(new Allocation({ asset, amount: BigInt(0) }))
    }
  })

  normalized.sort((a, b) => a.asset.compare(b.asset))

  return { normalized }
}
