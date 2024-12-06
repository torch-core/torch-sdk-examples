import { RatePayload, SignedRate } from '../../src'
import { MockSettings } from './config'

export const TrinPoolSignedRateJSON: SignedRate = {
  signatures: Buffer.from(
    'a4b3d575f8217cab6f6de56b45e609b03ec833156a63e4b7b93bd6fc4bd95086ea129674b4c6cdbecb80d74dd58408819474d09624a70ae4d441ec6f4db5ba08',
    'hex',
  ),
  payload: new RatePayload({
    expiration: 1833297075,
    sortedRates: [
      {
        asset: MockSettings.tonAsset,
        amount: 1000000000000000000000000000n,
      },
      {
        asset: MockSettings.tsTONAsset,
        amount: 1049874277013451578191769778n,
      },
      {
        asset: MockSettings.stTONAsset,
        amount: 1042229780180174538453046435n,
      },
    ],
  }),

  nextSignedRate: null,
}

export const FourTONPoolSignedRateJSON: SignedRate = {
  signatures: Buffer.from(
    'b17dc931f52f8932abacdae456b665afddeda52e0e0ed075fd20f5f6e95c3e4e5a50112fd575baad0523212f7fffad429a3e8a4030b3888cd8e68ab0e657ad0d',
    'hex',
  ),
  payload: new RatePayload({
    expiration: 1833032793,
    sortedRates: [
      {
        asset: MockSettings.triTONAsset,
        amount: 1000000000000000000n,
      },
      {
        asset: MockSettings.hTONAsset,
        amount: 1032264979322039621673140353n,
      },
    ],
  }),
  nextSignedRate: null,
}

