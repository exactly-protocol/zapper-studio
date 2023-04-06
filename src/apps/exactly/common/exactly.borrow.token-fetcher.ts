import type { GetDataPropsParams, GetTokenPropsParams } from '~position/template/app-token.template.types';

import type { ExactlyMarketDefinition } from '../common/exactly.definitions-resolver';
import { type ExactlyMarketProps, ExactlyTokenFetcher } from '../common/exactly.token-fetcher';
import type { Market } from '../contracts';

export abstract class ExactlyBorrowFetcher extends ExactlyTokenFetcher {
  groupLabel = 'Variable Borrow';
  isDebt = true;
  tokenId = 2;

  getSupply({ definition }: GetTokenPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return Promise.resolve(definition.current.totalFloatingBorrowShares);
  }

  getTotalAssets({ definition }: GetTokenPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return definition.current.totalFloatingBorrowAssets;
  }

  getApr({ definition }: GetDataPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return Number(definition.current.floatingBorrowRate) / 1e16;
  }
}
