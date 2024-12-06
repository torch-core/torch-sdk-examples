import { Address } from '@ton/core'
import { Asset } from '../../src'

export abstract class MockSettings {
  static readonly sender = Address.parse(
    '0QAHg-2Oy8Mc2BfENEaBcoDNXvHCu7mc28KkPIks8ZVqwmzg',
  )

  static readonly factoryAddress = Address.parse(
    'EQDzWCSmrIfx4hKo9aQS0-PppRcDsW-xJ34eMBwqQ-3v2WAh',
  )

  static readonly basePoolAddress = Address.parse(
    'EQBEKSg-xr02gOcm1zNpJ8VgO8tl2A1nvOy9lfpm1FtJ9ncG',
  )

  static readonly metaPoolAddress = Address.parse(
    'EQDYWQYgtEx4_UtZW7vLmhFxeMTKCI3Ha_5ywrx3pOi58n2w',
  )

  static readonly stTONAddress = Address.parse(
    'EQBbKadthJqQfnEsijYFvi25AKGDhS3CTVAf8oGZYwGk8G8W',
  )

  static readonly tsTONAddress = Address.parse(
    'EQA5rOnkPx8xTWvSjKAqEkdLOIM0-IyT_u-5IEQ5R2y9m-36',
  )

  static readonly hTONAddress = Address.parse(
    'EQDInlQkBcha9-KPGDR-eWi5VGhYPXO5s04amtzZ07s0Kzuu',
  )

  static readonly tonAsset = Asset.ton()

  static readonly tsTONAsset = Asset.jetton(MockSettings.tsTONAddress)

  static readonly stTONAsset = Asset.jetton(MockSettings.stTONAddress)

  static readonly hTONAsset = Asset.jetton(MockSettings.hTONAddress)

  static readonly triTONAsset = Asset.jetton(MockSettings.basePoolAddress)

  static readonly fourTONAsset = Asset.jetton(MockSettings.metaPoolAddress)

  static readonly emulateBlockSeq = 25523047

  static readonly blockUtime = 1732997209n
}
