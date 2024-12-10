import { Address } from '@ton/core';
import { Asset } from '@torch-finance/sdk';

export const testnetEndpoint = 'https://testnet-v4.tonhubapi.com';

export const testnetIndexer = 'https://testnet-indexer.torch.finance/';

export const factoryAddress = Address.parse(
  'EQDzWCSmrIfx4hKo9aQS0-PppRcDsW-xJ34eMBwqQ-3v2WAh'
);

export const LSDPoolAddress = Address.parse(
  'EQBEKSg-xr02gOcm1zNpJ8VgO8tl2A1nvOy9lfpm1FtJ9ncG'
);

export const MetaPoolAddress = Address.parse(
  'EQDYWQYgtEx4_UtZW7vLmhFxeMTKCI3Ha_5ywrx3pOi58n2w'
);

export const stTONAddress = Address.parse(
  'EQBbKadthJqQfnEsijYFvi25AKGDhS3CTVAf8oGZYwGk8G8W'
);

export const tsTONAddress = Address.parse(
  'EQA5rOnkPx8xTWvSjKAqEkdLOIM0-IyT_u-5IEQ5R2y9m-36'
);

export const hTONAddress = Address.parse(
  'EQDInlQkBcha9-KPGDR-eWi5VGhYPXO5s04amtzZ07s0Kzuu'
);

export const tonAsset = Asset.ton();

export const tsTONAsset = Asset.jetton(tsTONAddress);

export const stTONAsset = Asset.jetton(stTONAddress);

export const triTONAsset = Asset.jetton(LSDPoolAddress);

export const hTONAsset = Asset.jetton(hTONAddress);

export const metaLpAsset = Asset.jetton(MetaPoolAddress);

export const baseLpAsset = Asset.jetton(LSDPoolAddress);
