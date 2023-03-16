import { Inject } from '@nestjs/common';
import type { BigNumber } from 'ethers';

import { APP_TOOLKIT, IAppToolkit } from '~app-toolkit/app-toolkit.interface';
import { drillBalance } from '~app-toolkit/helpers/drill-balance.helper';
import { getLabelFromToken } from '~app-toolkit/helpers/presentation/image.present';
import { DollarDisplayItem, PercentageDisplayItem } from '~position/display.interface';
import { ContractPositionBalance } from '~position/position-balance.interface';
import type {
  DefaultContractPositionDefinition,
  GetDataPropsParams,
  GetDefinitionsParams,
  GetDisplayPropsParams,
} from '~position/template/contract-position.template.types';
import { CustomContractPositionTemplatePositionFetcher } from '~position/template/custom-contract-position.template.position-fetcher';

import { ExactlyContractFactory, Market } from '../contracts';

import { ExactlyDefinitionsResolver, type ExactlyMarketDefinition } from './exactly.definitions-resolver';
import type { ExactlyMarketProps } from './exactly.token-fetcher';

export type ExactlyFixedMarketProps = ExactlyMarketProps & { maturity: number; apy: number | undefined };

export abstract class ExactlyFixedPositionFetcher<
  V extends ExactlyFixedMarketProps = ExactlyFixedMarketProps,
> extends CustomContractPositionTemplatePositionFetcher<Market, V> {
  constructor(
    @Inject(APP_TOOLKIT) protected readonly appToolkit: IAppToolkit,
    @Inject(ExactlyContractFactory) protected readonly contractFactory: ExactlyContractFactory,
    @Inject(ExactlyDefinitionsResolver) protected readonly definitionsResolver: ExactlyDefinitionsResolver,
  ) {
    super(appToolkit);
  }

  getContract(address: string): Market {
    return this.contractFactory.market({ address, network: this.network });
  }

  getDefinitions({ multicall }: GetDefinitionsParams) {
    return this.definitionsResolver.getDefinitions({ multicall, network: this.network });
  }

  getLabel({
    contractPosition: { tokens },
  }: GetDisplayPropsParams<Market, V, DefaultContractPositionDefinition>): Promise<string> {
    return Promise.resolve(getLabelFromToken(tokens[0]));
  }

  getLabelDetailed({
    contractPosition: {
      tokens: [{ symbol }],
    },
  }: GetDisplayPropsParams<Market, V, ExactlyMarketDefinition>) {
    return Promise.resolve(symbol);
  }

  getSecondaryLabel({
    contractPosition: {
      tokens: [{ price }],
    },
  }: GetDisplayPropsParams<Market, V, DefaultContractPositionDefinition>): Promise<
    string | number | DollarDisplayItem | PercentageDisplayItem | undefined
  > {
    return Promise.resolve(price.toFixed(3));
  }

  async getTertiaryLabel(params: GetDisplayPropsParams<Market, V, DefaultContractPositionDefinition>) {
    const superLabel = (await super.getTertiaryLabel(params)) as string | undefined;
    const maturityTime = params.contractPosition.dataProps.maturity * 1_000;
    const dueDate = `${maturityTime < Date.now() ? '⚠️ ' : ''}${new Date(maturityTime).toISOString().slice(0, 10)}`;
    return superLabel ? `${superLabel} - ${dueDate}` : dueDate;
  }

  async getDataProps(params: GetDataPropsParams<Market, V>): Promise<V> {
    const { maturity } = this.getBestRate(params);
    const [superProps, apy] = await Promise.all([super.getDataProps(params), this.getApy(params)]);
    return { ...superProps, apy, maturity: maturity.toNumber() };
  }

  abstract getBestRate(_: GetDataPropsParams<Market, V>): {
    maturity: BigNumber;
    rate: BigNumber;
  };

  getApr(params: GetDataPropsParams<Market, ExactlyMarketProps, ExactlyMarketDefinition>) {
    return Number(this.getBestRate(params).rate) / 1e16;
  }

  getApy(params: GetDataPropsParams<Market, V>) {
    const { maturity, rate } = this.getBestRate(params);
    const timeLeft = maturity.toNumber() - Math.round(Date.now() / 1_000);
    return Promise.resolve(
      ((1 + ((Number(rate) / 1e18) * timeLeft) / 31_536_000) ** (31_536_000 / timeLeft) - 1) * 100,
    );
  }

  abstract getAPYsPerPosition(
    definition: ExactlyMarketDefinition,
  ): { apy?: number; maturity: number; previewValue: BigNumber; isDebt?: boolean }[];

  async getBalances(account: string): Promise<ContractPositionBalance<V>[]> {
    const multicall = this.appToolkit.getMulticall(this.network);
    const exactly = await this.definitionsResolver.getDefinitions({
      multicall,
      network: this.network,
      account,
    });
    const contractPositions = await this.appToolkit.getAppContractPositions<V>({
      appId: this.appId,
      network: this.network,
      groupIds: [this.groupId],
    });
    return Promise.all(
      exactly.map(async definition => {
        const { market, asset } = definition;
        const baseToken = await this.appToolkit.getBaseTokenPrice({
          network: this.network,
          address: asset.toLowerCase(),
        });
        if (!baseToken) return;
        const contractPosition = contractPositions.find(({ address }) => address === market.toLowerCase());
        if (!contractPosition) return;

        return this.getAPYsPerPosition(definition).map(({ apy, maturity, previewValue, isDebt }) => ({
          ...contractPosition,
          dataProps: {
            ...contractPosition.dataProps,
            apy,
            maturity,
          },
          tokens: contractPosition.tokens.map(token => drillBalance(token, String(previewValue), { isDebt })),
          balanceUSD: (Number(previewValue) / 1 ** baseToken.decimals) * baseToken.price,
        }));
      }),
    ).then(a => a.flatMap(array => array ?? []));
  }
}
