import { Inject } from '@nestjs/common';
import { BigNumberish, constants } from 'ethers';

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

import { ExactlyDefinitionsResolver, ExactlyMarketDefinition } from './exactly.definitions-resolver';
import { ExactlyFixedPositionFetcher, ExactlyFixedMarketProps } from './exactly.fixed.contract-position-fetcher';
import type { ExactlyMarketProps } from './exactly.token-fetcher';

export abstract class ExactlyFixedDepositFetcher extends ExactlyFixedPositionFetcher {
  groupLabel = 'Fixed Deposit';
  isDebt = false;

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
    return [{ metaType: MetaType.SUPPLIED, address: await contract.asset(), network: this.network }];
  }

  async getTokenBalancesPerPosition({
    address,
    contract,
    multicall,
  }: GetTokenBalancesParams<Market, ExactlyFixedMarketProps>): Promise<BigNumberish[]> {
    const { fixedDepositPositions } = await this.definitionsResolver.getDefinition({
      multicall,
      network: this.network,
      account: address,
      market: contract.address,
    });

    return [fixedDepositPositions.reduce((total, { previewValue }) => total.add(previewValue), constants.Zero)];
  }

  getTotalAssets({ definition }: GetTokenPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return definition.fixedPools.reduce((total, { supplied }) => total.add(supplied), constants.Zero);
  }

  getBestRate({ definition }: GetDataPropsParams<Market, ExactlyFixedMarketProps, ExactlyMarketDefinition>) {
    return definition.fixedPools.reduce(
      (best, { maturity, depositRate: rate }) => (rate.gt(best.rate) ? { maturity, rate } : best),
      { maturity: constants.Zero, rate: constants.Zero },
    );
  }

  getAPYsPerPosition({ fixedDepositPositions }: ExactlyMarketDefinition) {
    return fixedDepositPositions.map(({ previewValue, maturity }) => {
      const timeLeft = maturity.toNumber() - Math.round(Date.now() / 1_000);
      return {
        apy: timeLeft < 0 ? 0 : undefined,
        maturity: maturity.toNumber(),
        previewValue: previewValue,
      };
    });
  }
}
