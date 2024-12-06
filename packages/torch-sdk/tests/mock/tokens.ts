// import { Address } from '@ton/core'
// import { Asset, GqlAsset } from '../types/Asset'
// import { PoolInfo } from '../types/Pool'

// export interface IConfig {
//   readonly indexerURL: string
//   readonly oracleURL: string
//   readonly FactoryAddress: Address

//   readonly TON: GqlAsset
//   readonly TSTON: GqlAsset
//   readonly STTON: GqlAsset
//   readonly HTON: GqlAsset
//   readonly TriTon: GqlAsset
//   readonly FourTon: GqlAsset
//   readonly LsdBasePool: PoolInfo
//   readonly LsdMetaPool: PoolInfo
//   getTokens(): Promise<GqlAsset[]>
//   getPools(): Promise<PoolInfo[]>
// }

// export class MainnetConfig implements IConfig {
//   readonly indexerURL = 'http://localhost:3000'
//   readonly oracleURL = 'https://oracle.torch.finance'
//   readonly FactoryAddress = Address.parse(
//     'EQC-j2kTcZtkBnIQzKJ3OlsO6s_dbA3zkjdfPhTZi0Zl5hao',
//   )

//   readonly TON = new GqlAsset(
//     Asset.ton(),
//     'TON',
//     'TON',
//     9,
//     'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNs-kVbkFzfwo7T9afef6geZ60QkS8U1VMPw&s',
//   )

//   readonly TSTON = new GqlAsset(
//     Asset.jetton(
//       Address.parse(
//         '0:bdf3fa8098d129b54b4f73b5bac5d1e1fd91eb054169c3916dfc8ccd536d1000',
//       ),
//     ),
//     'Tonstakers TON',
//     'tsTON',
//     9,
//     'https://cache.tonapi.io/imgproxy/GjhSro_E6Qxod2SDQeDhJA_F3yARNomyZFKeKw8TVOU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90b25zdGFrZXJzLmNvbS9qZXR0b24vbG9nby5zdmc.webp',
//   )

//   readonly STTON = new GqlAsset(
//     Asset.jetton(
//       Address.parse('EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k'),
//     ),
//     'Staked TON',
//     'stTON',
//     9,
//     'https://cache.tonapi.io/imgproxy/BBswWn_XyuF6aNntVmh-yXANFKQ_PkUpt30z-kotVvg/rs:fill:200:200:1/g:no/aHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL21pbGtjcmVlay90b2tlbnMvc3RUT04ucG5n.webp',
//   )

//   readonly HTON = new GqlAsset(
//     Asset.jetton(
//       Address.parse('EQDPdq8xjAhytYqfGSX8KcFWIReCufsB9Wdg0pLlYSO_h76w'),
//     ),
//     'Hipo Staked TON',
//     'hTON',
//     9,
//     'https://cache.tonapi.io/imgproxy/K_-tSAqrP5GfvSmb_AtjmZ_fZdGu61_xWUUrHR-Hkew/rs:fill:200:200:1/g:no/aHR0cHM6Ly9hcHAuaGlwby5maW5hbmNlL2h0b24ucG5n.webp',
//   )

//   readonly TriTon = new GqlAsset(
//     Asset.jetton(
//       Address.parse('0QDrRQlKRo5J10a-nUb8UQ7f3ueVYBQVZV9X8uAjmS7gH1Gy'),
//     ),
//     'TriTon',
//     'TriTon',
//     18,
//     '',
//   )

//   readonly FourTon = new GqlAsset(
//     Asset.jetton(
//       Address.parse('0QDrRQlKRo5J10a-nUb8UQ7f3ueVYBQVZV9X8uAjmS7gH1Gy'),
//     ),
//     'FourTon',
//     'FourTon',
//     18,
//     '',
//   )

//   readonly LsdBasePool: PoolInfo = new BasePoolInfo(
//     this.TriTon,
//     [this.TON, this.TSTON, this.STTON],
//     true,
//   )

//   readonly LsdMetaPool: MetaPoolInfo = new MetaPoolInfo(
//     this.FourTon,
//     [this.TriTon, this.HTON],
//     true,
//     this.LsdBasePool,
//   )

//   async getTokens(): Promise<GqlAsset[]> {
//     return [this.TON, this.TSTON, this.STTON, this.HTON]
//   }
//   async getPools(): Promise<PoolInfo[]> {
//     return [this.LsdBasePool, this.LsdMetaPool]
//   }
// }

// export class TestnetConfig implements IConfig {
//   readonly indexerURL = 'http://localhost:3000'
//   readonly oracleURL = 'https://oracle.torch.finance'

//   readonly FactoryAddress = Address.parse(
//     'EQAQN0BlMrqlgO0d8Ofi-3qq3E5oyrkBuXHFSZDT8hCTS659',
//   )

//   readonly TON = new GqlAsset(
//     Asset.ton(),
//     'TON',
//     'TON',
//     9,
//     'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNs-kVbkFzfwo7T9afef6geZ60QkS8U1VMPw&s',
//   )

//   readonly TSTON = new GqlAsset(
//     Asset.jetton(
//       Address.parse('EQA5rOnkPx8xTWvSjKAqEkdLOIM0-IyT_u-5IEQ5R2y9m-36'),
//     ),
//     'Tonstakers TON',
//     'tsTON',
//     9,
//     'https://cache.tonapi.io/imgproxy/GjhSro_E6Qxod2SDQeDhJA_F3yARNomyZFKeKw8TVOU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90b25zdGFrZXJzLmNvbS9qZXR0b24vbG9nby5zdmc.webp',
//   )

//   readonly STTON = new GqlAsset(
//     Asset.jetton(
//       Address.parse('EQBbKadthJqQfnEsijYFvi25AKGDhS3CTVAf8oGZYwGk8G8W'),
//     ),
//     'Staked TON',
//     'stTON',
//     9,
//     'https://cache.tonapi.io/imgproxy/BBswWn_XyuF6aNntVmh-yXANFKQ_PkUpt30z-kotVvg/rs:fill:200:200:1/g:no/aHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL21pbGtjcmVlay90b2tlbnMvc3RUT04ucG5n.webp',
//   )

//   readonly HTON = new GqlAsset(
//     Asset.jetton(
//       Address.parse('EQDInlQkBcha9-KPGDR-eWi5VGhYPXO5s04amtzZ07s0Kzuu'),
//     ),
//     'Hipo Staked TON',
//     'hTON',
//     9,
//     'https://cache.tonapi.io/imgproxy/K_-tSAqrP5GfvSmb_AtjmZ_fZdGu61_xWUUrHR-Hkew/rs:fill:200:200:1/g:no/aHR0cHM6Ly9hcHAuaGlwby5maW5hbmNlL2h0b24ucG5n.webp',
//   )

//   readonly TriTon = new GqlAsset(
//     Asset.jetton(
//       Address.parse('kQA-9ZU2JjNtp6yybsdjGhUoZzGsK5Mn_5UW7CSqe7i03y-h'),
//     ),
//     'TriTon',
//     'TriTon',
//     18,
//     'https://cache.tonapi.io/imgproxy/KjtQz0w7W4Meg1eV6J1DxzJ0oyYMisLbNEU38cH0D6s/rs:fill:200:200:1/g:no/aHR0cHM6Ly9wdXJwbGUtaW50YWN0LXNxdWlycmVsLTEzMC5teXBpbmF0YS5jbG91ZC9pcGZzL1FtYm9VZ0VLRzR2Y2VaVkM2bTRkODlMbjYzb0s3QmNMSnJFcFBwRmdQRkNxMVM.webp',
//   )

//   readonly FourTon = new GqlAsset(
//     Asset.jetton(
//       Address.parse('EQCoIqngiUn3-zvVyu_BK844QnvlzdsVJlyb9IdSwOvIx04-'),
//     ),
//     'FourTon',
//     'FourTon',
//     18,
//     '',
//   )

//   readonly LsdBasePool: BasePoolInfo = new BasePoolInfo(
//     this.TriTon,
//     [this.TON, this.TSTON, this.STTON],
//     true,
//   )

//   readonly LsdMetaPool: MetaPoolInfo = new MetaPoolInfo(
//     this.FourTon,
//     [this.TriTon, this.HTON],
//     true,
//     this.LsdBasePool,
//   )

//   async getTokens(): Promise<GqlAsset[]> {
//     return [
//       this.TON,
//       this.TSTON,
//       this.STTON,
//       this.HTON,
//       this.TriTon,
//       this.FourTon,
//     ]
//   }
//   async getPools(): Promise<PoolInfo[]> {
//     return [this.LsdBasePool, this.LsdMetaPool]
//   }
// }
