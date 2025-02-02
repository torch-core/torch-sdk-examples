import { Address } from '@ton/core';
import { Asset } from '@torch-finance/core';

export const testnetEndpoint = 'https://testnet-v4.tonhubapi.com';

export const testnetApi = 'https://testnet-api.torch.finance';

export const testnetOracle = 'https://testnet-oracle.torch.finance';

export const factoryAddress = Address.parse(
  'EQCphoE6MwHy2kvnim6RrRr71oY6KSTMXiTMAEu-qRS4QUwV'
);

export const BasePoolAddress = Address.parse(
  'EQDbr509-6mnEyVunP2L4WdOo0WksZohqzpsEzXIJo7RSnfK'
);

export const MetaPoolAddress = Address.parse(
  'EQAE9vvdmXQo193QLtPbEQ0HPU1hqo9Mo3tJPKnT6zACu8Ps'
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

export const TON_ASSET = Asset.ton();

export const STTON_ASSET = Asset.jetton(
  Address.parse('EQBbKadthJqQfnEsijYFvi25AKGDhS3CTVAf8oGZYwGk8G8W')
);

export const TSTON_ASSET = Asset.jetton(
  Address.parse('EQA5rOnkPx8xTWvSjKAqEkdLOIM0-IyT_u-5IEQ5R2y9m-36')
);

export const TRITON_ASSET = Asset.jetton(
  Address.parse('EQDbr509-6mnEyVunP2L4WdOo0WksZohqzpsEzXIJo7RSnfK')
);

export const HTON_ASSET = Asset.jetton(
  Address.parse('EQDInlQkBcha9-KPGDR-eWi5VGhYPXO5s04amtzZ07s0Kzuu')
);

export const QUADTON_ASSET = Asset.jetton(
  Address.parse('EQAE9vvdmXQo193QLtPbEQ0HPU1hqo9Mo3tJPKnT6zACu8Ps')
);

export const CRVUSD_ASSET = Asset.jetton(crvUSDAddress);

export const USDT_ASSET = Asset.jetton(USDTAddress);

export const USDC_ASSET = Asset.jetton(USDCAddress);

export const TRIUSD_ASSET = Asset.jetton(BasePoolAddress);

export const SCRVUSD_ASSET = Asset.jetton(scrvUSDAddress);

export const METAUSD_ASSET = Asset.jetton(MetaPoolAddress);
