import { constants } from 'ethers';

import type { GetDataPropsParams, GetTokenPropsParams } from '~position/template/app-token.template.types';

import type { ExactlyMarketDefinition } from '../common/exactly.definitions-resolver';
import { ExactlyFixedPositionFetcher } from '../common/exactly.fixed-position-fetcher';
import type { ExactlyMarketProps } from '../common/exactly.token-fetcher';
import type { Market } from '../contracts';

export abstract class ExactlyFixedBorrowFetcher extends ExactlyFixedPositionFetcher {
  groupLabel = 'Fixed Borrow';
  isDebt = true;
  tokenId = 4;

  getTotalAssets({ definition }: GetTokenPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return definition.current.fixedPools.reduce((total, { borrowed }) => total.add(borrowed), constants.Zero);
  }

  getBestRate({ definition }: GetDataPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return definition.current.fixedPools.reduce(
      (best, { maturity, minBorrowRate: rate }) => (rate.lt(best.rate) ? { maturity, rate } : best),
      { maturity: constants.Zero, rate: constants.MaxUint256 },
    );
  }
}
