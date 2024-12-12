import { Address } from '@ton/core';
import { Asset } from '@torch-finance/sdk';

export const testnetEndpoint = 'https://testnet-v4.tonhubapi.com';

export const testnetIndexer = 'https://testnet-indexer.torch.finance/';

export const factoryAddress = Address.parse(
  'EQAEQ_tRYl3_EJXBTGIKaao0AVZ00OOYOnabhR1aEVXfSoFa'
);

export const TriUSDPoolAddress = Address.parse(
  'EQC2uohuNYsFl6nw1AEAf5jw3AGNk31iGDnG_jtR9Kzu63ol'
);

export const MetaPoolAddress = Address.parse(
  'EQA5h4BouMbOmb2tY-rgks-EykMNc5dionZk1MuhUlO7z9Zi'
);

export const USDCAddress = Address.parse(
  'EQARxQlZfQUxhTcCRg4QraCtxmvw1GoGOeEanbcc55wLZg3E'
);

export const USDTAddress = Address.parse(
  'EQBflht80hwbivqv3Hnlhigqfe4RdY4Kb-LSOVldvGBsAgOQ'
);

export const crvUSDAddress = Address.parse(
  'EQC76HKO16zcESvqLzDXpV98uRNiPDl_TO-g6794VMDGbbNZ'
);

export const scrvUSDAddress = Address.parse(
  'EQBN8qMhmCS2yj9a7KqRJTGPv8AZmfsBnRrw3ClODwpyus8v'
);

export const tonAsset = Asset.ton();

export const CRVUSD_ASSET = Asset.jetton(crvUSDAddress);

export const USDT_ASSET = Asset.jetton(USDTAddress);

export const USDC_ASSET = Asset.jetton(USDCAddress);

export const TRIUSD_ASSET = Asset.jetton(TriUSDPoolAddress);

export const SCRVUSD_ASSET = Asset.jetton(scrvUSDAddress);

export const METAUSD_ASSET = Asset.jetton(MetaPoolAddress);
