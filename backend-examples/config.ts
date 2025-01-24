import { Address } from '@ton/core';
import { TonClient4 } from '@ton/ton';
import { Asset } from '@torch-finance/core';
import { TorchSDKOptions } from '@torch-finance/sdk';

export const testnetEndpoint = 'https://testnet-v4.tonhubapi.com';

export const testnetApi = 'https://testnet-api.torch.finance';

export const testnetOracle = 'https://testnet-oracle.torch.finance';

export const factoryAddress = Address.parse(
  'EQBO9Xw9w0hJQx4kw3RSKu2LROZbtKg4icITKYp5enCQVGCu'
);

export const BasePoolAddress = Address.parse(
  'EQCEao02tugbZjudFRMfyu2s_nVZli7F_rgxC1OjdvXpsBsw'
);

export const MetaPoolAddress = Address.parse(
  'EQA4rUktNrzOmgZ4OzsOX5Q-C1KelFPCtH8ln2YaHgyAO4kc'
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
  Address.parse('EQCEao02tugbZjudFRMfyu2s_nVZli7F_rgxC1OjdvXpsBsw')
);

export const HTON_ASSET = Asset.jetton(
  Address.parse('EQDInlQkBcha9-KPGDR-eWi5VGhYPXO5s04amtzZ07s0Kzuu')
);

export const QUADTON_ASSET = Asset.jetton(
  Address.parse('EQA4rUktNrzOmgZ4OzsOX5Q-C1KelFPCtH8ln2YaHgyAO4kc')
);

export const CRVUSD_ASSET = Asset.jetton(crvUSDAddress);

export const USDT_ASSET = Asset.jetton(USDTAddress);

export const USDC_ASSET = Asset.jetton(USDCAddress);

export const TRIUSD_ASSET = Asset.jetton(BasePoolAddress);

export const SCRVUSD_ASSET = Asset.jetton(scrvUSDAddress);

export const METAUSD_ASSET = Asset.jetton(MetaPoolAddress);
