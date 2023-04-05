import { Inject } from '@nestjs/common';
import { type BigNumberish, constants } from 'ethers';

import { APP_TOOLKIT, IAppToolkit } from '~app-toolkit/app-toolkit.interface';
import { MetaType } from '~position/position.interface';
import type { GetTokenPropsParams } from '~position/template/app-token.template.types';
import type {
  DefaultContractPositionDefinition,
  GetDataPropsParams,
  GetTokenBalancesParams,
  GetTokenDefinitionsParams,
  UnderlyingTokenDefinition,
} from '~position/template/contract-position.template.types';

import { ExactlyContractFactory, Market } from '../contracts';

import { ExactlyDefinitionsResolver, type ExactlyMarketDefinition } from './exactly.definitions-resolver';
import { ExactlyFixedPositionFetcher, type ExactlyFixedMarketProps } from './exactly.fixed.contract-position-fetcher';
import type { ExactlyMarketProps } from './exactly.token-fetcher';

export abstract class ExactlyFixedBorrowFetcher extends ExactlyFixedPositionFetcher {
  groupLabel = 'Fixed Borrow';
  isDebt = true;

  constructor(
    @Inject(APP_TOOLKIT) protected readonly appToolkit: IAppToolkit,
    @Inject(ExactlyContractFactory) protected readonly contractFactory: ExactlyContractFactory,
    @Inject(ExactlyDefinitionsResolver) protected readonly definitionsResolver: ExactlyDefinitionsResolver,
  ) {
    super(appToolkit, contractFactory, definitionsResolver);
  }

  async getTokenDefinitions({
    contract,
  }: GetTokenDefinitionsParams<Market, DefaultContractPositionDefinition>): Promise<
    UnderlyingTokenDefinition[] | null
  > {
    return [{ metaType: MetaType.BORROWED, address: await contract.asset(), network: this.network }];
  }

  getTotalAssets({ definition }: GetTokenPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return definition.fixedPools.reduce((total, { borrowed }) => total.add(borrowed), constants.Zero);
  }

  getBestRate({ definition }: GetDataPropsParams<Market, ExactlyFixedMarketProps, ExactlyMarketDefinition>) {
    return definition.fixedPools.reduce(
      (best, { maturity, minBorrowRate: rate }) => (rate.lt(best.rate) ? { maturity, rate } : best),
      { maturity: constants.Zero, rate: constants.MaxUint256 },
    );
  }

  async getTokenBalancesPerPosition({
    address,
    contract,
    multicall,
  }: GetTokenBalancesParams<Market, ExactlyFixedMarketProps>): Promise<BigNumberish[]> {
    const { fixedBorrowPositions } = await this.definitionsResolver.getDefinition({
      multicall,
      network: this.network,
      account: address,
      market: contract.address,
    });

    return [fixedBorrowPositions.reduce((total, { previewValue }) => total.add(previewValue), constants.Zero)];
  }

  getAPYsPerPosition({ fixedBorrowPositions, penaltyRate }: ExactlyMarketDefinition) {
    return fixedBorrowPositions.map(({ previewValue, maturity }) => {
      const timeLeft = maturity.toNumber() - Math.round(Date.now() / 1_000);
      return {
        apy: timeLeft < 0 ? (Number(penaltyRate) * 31_536_000) / 1e16 : undefined,
        maturity: maturity.toNumber(),
        previewValue,
        isDebt: true,
      };
    });
  }
}
