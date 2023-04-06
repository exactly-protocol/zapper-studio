import { Inject } from '@nestjs/common';
import { constants, type BigNumberish } from 'ethers';

import { APP_TOOLKIT, type IAppToolkit } from '~app-toolkit/app-toolkit.interface';
import { drillBalance } from '~app-toolkit/helpers/drill-balance.helper';
import type { ContractPositionBalance } from '~position/position-balance.interface';
import { MetaType } from '~position/position.interface';
import type {
  GetDefinitionsParams,
  GetDisplayPropsParams,
  GetTokenDefinitionsParams,
} from '~position/template/contract-position.template.types';
import { CustomContractPositionTemplatePositionFetcher } from '~position/template/custom-contract-position.template.position-fetcher';

import { ExactlyContractFactory, type Market } from '../contracts';

import { ExactlyDefinitionsResolver, type ExactlyMarketDefinition } from './exactly.definitions-resolver';
import { ExactlyMarketProps } from './exactly.token-fetcher';

export abstract class ExactlyMarketFetcher extends CustomContractPositionTemplatePositionFetcher<
  Market,
  ExactlyMarketProps,
  ExactlyMarketDefinition
> {
  groupLabel = 'Markets';

  constructor(
    @Inject(APP_TOOLKIT) protected readonly appToolkit: IAppToolkit,
    @Inject(ExactlyContractFactory) protected readonly contractFactory: ExactlyContractFactory,
    @Inject(ExactlyDefinitionsResolver) protected readonly definitionsResolver: ExactlyDefinitionsResolver,
  ) {
    super(appToolkit);
  }

  getDefinitions({ multicall }: GetDefinitionsParams) {
    return this.definitionsResolver.getDefinitions({ multicall, network: this.network });
  }

  getContract(address: string) {
    return this.contractFactory.market({ address, network: this.network });
  }

  getTokenDefinitions({ address, definition }: GetTokenDefinitionsParams<Market, ExactlyMarketDefinition>) {
    return Promise.resolve([
      { metaType: MetaType.SUPPLIED, address, tokenId: 1, network: this.network },
      { metaType: MetaType.BORROWED, address, tokenId: 2, network: this.network },
      { metaType: MetaType.SUPPLIED, address, tokenId: 3, network: this.network },
      { metaType: MetaType.BORROWED, address, tokenId: 4, network: this.network },
      ...definition.current.rewardRates.map(({ asset }) => ({
        metaType: MetaType.CLAIMABLE,
        address: asset.toLowerCase(),
        network: this.network,
      })),
    ]);
  }

  getLabel({ definition }: GetDisplayPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return Promise.resolve(definition.current.symbol);
  }

  getTokenBalancesPerPosition(): Promise<BigNumberish[]> {
    throw new Error('not implemented');
  }

  async getBalances(account: string) {
    const contractPositions = await this.appToolkit.getAppContractPositions<ExactlyMarketProps>({
      appId: this.appId,
      network: this.network,
      groupIds: [this.groupId],
    });
    const definitions = await this.definitionsResolver.getDefinitions({
      multicall: this.appToolkit.getMulticall(this.network),
      network: this.network,
      account,
    });
    return contractPositions.map((contractPosition, i) => {
      const {
        floatingDepositShares,
        floatingBorrowShares,
        fixedDepositPositions,
        fixedBorrowPositions,
        claimableRewards,
      } = definitions[i].current;
      const balancesRaw = [
        floatingDepositShares,
        floatingBorrowShares,
        fixedDepositPositions.reduce((total, { previewValue }) => total.add(previewValue), constants.Zero),
        fixedBorrowPositions.reduce((total, { previewValue }) => total.add(previewValue), constants.Zero),
        ...claimableRewards.map(({ amount }) => amount),
      ];
      const tokens = contractPosition.tokens
        .map((token, j) =>
          drillBalance(token, balancesRaw[j]?.toString() ?? '0', { isDebt: token.metaType === MetaType.BORROWED }),
        )
        .filter(v => Math.abs(v.balanceUSD) > 0.01);
      const balanceUSD = tokens.reduce((t, { balanceUSD }) => t + balanceUSD, 0);
      return { ...contractPosition, tokens, balanceUSD } as ContractPositionBalance<ExactlyMarketProps>;
    });
  }
}
