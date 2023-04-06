import { constants } from 'ethers';

import type {
  GetDataPropsParams,
  GetDisplayPropsParams,
  GetTokenPropsParams,
} from '~position/template/app-token.template.types';

import type { ExactlyMarketDefinition } from '../common/exactly.definitions-resolver';
import { type ExactlyMarketProps, ExactlyTokenFetcher } from '../common/exactly.token-fetcher';
import type { Market } from '../contracts';

export abstract class ExactlyDepositFetcher extends ExactlyTokenFetcher {
  groupLabel = 'Variable Deposit';
  tokenId = 1;

  getSupply({ definition }: GetTokenPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return Promise.resolve(definition.current.totalFloatingDepositShares);
  }

  getTotalAssets({ definition }: GetTokenPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return definition.current.totalFloatingDepositAssets;
  }

  getLabelDetailed({ appToken }: GetDisplayPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return Promise.resolve(appToken.symbol);
  }

  getApr({
    definition: { current, previous },
  }: GetDataPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    const shareValue = current.totalFloatingDepositAssets
      .mul(constants.WeiPerEther)
      .div(current.totalFloatingDepositShares);
    const prevShareValue = previous.totalFloatingDepositAssets
      .mul(constants.WeiPerEther)
      .div(previous.totalFloatingDepositShares);
    const proportion = shareValue.mul(constants.WeiPerEther).div(prevShareValue);
    return (Number(proportion) / 1e16 - 100) * (31_536_000 / (current.timestamp - previous.timestamp));
  }
}
