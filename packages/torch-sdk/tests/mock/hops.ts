import { PoolInfo } from '../../src/types/pool/pools'
import { Asset } from '../../src'
import { Hop, HopAction } from '../../src/types/hop'

export function calculateHops(
  poolsData: PoolInfo[],
  assetIn: Asset,
  assetOut: Asset,
): Hop[] {
  if (assetIn.equals(assetOut)) {
    throw new Error('Asset in and asset out cannot be the same')
  }

  let currentAssetIn = assetIn
  const routes: Hop[] = []

  for (let i = 0; i < poolsData.length; i++) {
    const currentPool = poolsData[i]
    const currentPoolAssets = [
      ...currentPool.assets,
      Asset.jetton(currentPool.address),
    ]
    const currentPoolLpAsset = Asset.jetton(currentPool.address)

    if (i < poolsData.length - 1) {
      const nextPool = poolsData[i + 1]
      const nextPoolAssets = [
        ...nextPool.assets,
        Asset.jetton(nextPool.address),
      ]

      const currentPoolPossibleAssets = currentPoolAssets.filter(
        (asset) => !asset.equals(currentAssetIn),
      )

      const intersection = currentPoolPossibleAssets.filter((asset) =>
        nextPoolAssets.some((nextAsset) => nextAsset.equals(asset)),
      )

      if (intersection.length === 0) {
        throw new Error('Cannot find valid action to connect pools')
      }

      const selectedAssetOut = intersection[0]
      const action = determineHopAction(
        currentPool,
        currentAssetIn,
        selectedAssetOut,
        currentPoolLpAsset,
      )

      routes.push(
        new Hop({
          action: action as HopAction,
          pool: currentPool,
          assetIn: currentAssetIn,
          assetOut: selectedAssetOut,
        }),
      )

      currentAssetIn = selectedAssetOut
    } else {
      const action = determineHopAction(
        currentPool,
        currentAssetIn,
        assetOut,
        currentPoolLpAsset,
      )

      routes.push(
        new Hop({
          action: action as HopAction,
          pool: currentPool,
          assetIn: currentAssetIn,
          assetOut: assetOut,
        }),
      )
    }
  }

  return routes
}

function determineHopAction(
  currentPool: PoolInfo,
  currentAssetIn: Asset,
  assetOut: Asset,
  currentPoolLpAsset: Asset,
): HopAction {
  if (
    currentPool.assets.some((asset) => asset.equals(currentAssetIn)) &&
    assetOut.equals(currentPoolLpAsset)
  ) {
    return HopAction.DEPOSIT // pool asset -> lp asset
  } else if (
    currentPool.assets.some((asset) => asset.equals(currentAssetIn)) &&
    currentPool.assets.some((asset) => asset.equals(assetOut))
  ) {
    return HopAction.SWAP // pool asset -> pool asset
  } else if (
    currentAssetIn.equals(currentPoolLpAsset) &&
    currentPool.assets.some((asset) => asset.equals(assetOut))
  ) {
    return HopAction.WITHDRAW // lp asset -> pool asset
  }
  throw new Error('Cannot determine hop action')
}
