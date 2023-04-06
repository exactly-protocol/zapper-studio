import { Inject } from '@nestjs/common';
import { constants, type BigNumber } from 'ethers';

import { APP_TOOLKIT, type IAppToolkit } from '~app-toolkit/app-toolkit.interface';
import { getLabelFromToken } from '~app-toolkit/helpers/presentation/image.present';
import { BalanceDisplayMode } from '~position/display.interface';
import { AppTokenTemplatePositionFetcher } from '~position/template/app-token.template.position-fetcher';
import type {
  GetAddressesParams,
  GetDataPropsParams,
  GetDefinitionsParams,
  GetTokenPropsParams,
  GetUnderlyingTokensParams,
  DefaultAppTokenDataProps,
  GetPricePerShareParams,
  GetDisplayPropsParams,
} from '~position/template/app-token.template.types';

import { ExactlyContractFactory, type Market } from '../contracts';

import { ExactlyDefinitionsResolver, type ExactlyMarketDefinition } from './exactly.definitions-resolver';

export type ExactlyMarketProps = DefaultAppTokenDataProps & { apr: number; tokenId: number };

export abstract class ExactlyTokenFetcher<
  V extends ExactlyMarketProps = ExactlyMarketProps,
> extends AppTokenTemplatePositionFetcher<Market, V, ExactlyMarketDefinition> {
  abstract tokenId: number;
  isExcludedFromBalances = true;
  isExcludedFromExplore = true;
  isExcludedFromTvl = true;

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

  getAddresses({ definitions }: GetAddressesParams<ExactlyMarketDefinition>) {
    return definitions.map(({ address }) => address);
  }

  getUnderlyingTokenDefinitions({ definition }: GetUnderlyingTokensParams<Market, ExactlyMarketDefinition>) {
    return Promise.resolve([{ address: definition.current.asset.toLowerCase(), network: this.network }]);
  }

  getSymbol({ definition }: GetTokenPropsParams<Market, V, ExactlyMarketDefinition>) {
    return Promise.resolve(definition.current.symbol);
  }

  getDecimals({ definition }: GetTokenPropsParams<Market, V, ExactlyMarketDefinition>) {
    return Promise.resolve(definition.current.decimals);
  }

  getLabel({ appToken }: GetDisplayPropsParams<Market, V, ExactlyMarketDefinition>) {
    const [underlyingToken] = appToken.tokens;
    return Promise.resolve(getLabelFromToken(underlyingToken));
  }

  getBalanceDisplayMode() {
    return Promise.resolve(BalanceDisplayMode.UNDERLYING);
  }

  async getPricePerShare(params: GetPricePerShareParams<Market, V, ExactlyMarketDefinition>) {
    const [supply, totalAssets] = await Promise.all([this.getSupply(params), this.getTotalAssets(params)]);
    if (!BigInt(String(supply))) return [1];
    return [Number(totalAssets.mul(constants.WeiPerEther).div(supply)) / 1e18];
  }

  getApy(params: GetDataPropsParams<Market, V, ExactlyMarketDefinition>) {
    return Promise.resolve(((1 + this.getApr(params) / (100 * 31_536_000)) ** 31_536_000 - 1) * 100);
  }

  async getDataProps(params: GetDataPropsParams<Market, V, ExactlyMarketDefinition>) {
    const [superProps, apr] = await Promise.all([super.getDataProps(params), this.getApr(params)]);
    return { ...superProps, apr, tokenId: this.tokenId };
  }

  abstract getTotalAssets(_: GetTokenPropsParams<Market, V, ExactlyMarketDefinition>): BigNumber | Promise<BigNumber>;

  getApr(_: GetDataPropsParams<Market, V, ExactlyMarketDefinition>): number {
    return 0;
  }
}
