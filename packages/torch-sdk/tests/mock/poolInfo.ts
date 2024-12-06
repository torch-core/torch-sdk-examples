import { Address } from '@ton/core'
import { AssetType } from '../../src'
import { IPoolInfo, PoolType } from '../../src/types/pool/pools'

export const TrinPoolJSON: IPoolInfo = {
  type: PoolType.BASE,
  lpAsset: {
    type: AssetType.Jetton,
    jettonMaster: Address.parse(
      'EQBEKSg-xr02gOcm1zNpJ8VgO8tl2A1nvOy9lfpm1FtJ9ncG',
    ),
    currencyId: undefined,
  },
  assets: [
    {
      type: AssetType.Ton,
      jettonMaster: undefined,
      currencyId: undefined,
    },
    {
      type: AssetType.Jetton,
      jettonMaster: Address.parse(
        'EQA5rOnkPx8xTWvSjKAqEkdLOIM0-IyT_u-5IEQ5R2y9m-36',
      ),
      currencyId: undefined,
    },
    {
      type: AssetType.Jetton,
      jettonMaster: Address.parse(
        'EQBbKadthJqQfnEsijYFvi25AKGDhS3CTVAf8oGZYwGk8G8W',
      ),
      currencyId: undefined,
    },
  ],
  useRates: true,
  basePoolInfo: undefined,
}

export const FourTONPoolJSON: IPoolInfo = {
  type: PoolType.META,
  lpAsset: {
    type: AssetType.Jetton,
    jettonMaster: Address.parse(
      'EQDYWQYgtEx4_UtZW7vLmhFxeMTKCI3Ha_5ywrx3pOi58n2w',
    ),
    currencyId: undefined,
  },
  assets: [
    {
      type: AssetType.Jetton,
      jettonMaster: Address.parse(
        'EQBEKSg-xr02gOcm1zNpJ8VgO8tl2A1nvOy9lfpm1FtJ9ncG',
      ),
      currencyId: undefined,
    },
    {
      type: AssetType.Jetton,
      jettonMaster: Address.parse(
        'EQDInlQkBcha9-KPGDR-eWi5VGhYPXO5s04amtzZ07s0Kzuu',
      ),
      currencyId: undefined,
    },
  ],
  useRates: true,
  basePoolInfo: TrinPoolJSON,
}
