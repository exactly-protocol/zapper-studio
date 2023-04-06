import { constants } from 'ethers';

import type { GetDataPropsParams, GetTokenPropsParams } from '~position/template/app-token.template.types';

import type { ExactlyMarketDefinition } from '../common/exactly.definitions-resolver';
import { ExactlyFixedPositionFetcher } from '../common/exactly.fixed-position-fetcher';
import type { ExactlyMarketProps } from '../common/exactly.token-fetcher';
import type { Market } from '../contracts';

export abstract class ExactlyFixedDepositFetcher extends ExactlyFixedPositionFetcher {
  groupLabel = 'Fixed Deposit';
  tokenId = 3;

  getTotalAssets({ definition }: GetTokenPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return definition.current.fixedPools.reduce((total, { supplied }) => total.add(supplied), constants.Zero);
  }

  getBestRate({ definition }: GetDataPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return definition.current.fixedPools.reduce(
      (best, { maturity, depositRate: rate }) => (rate.gt(best.rate) ? { maturity, rate } : best),
      { maturity: constants.Zero, rate: constants.Zero },
    );
  }
}
