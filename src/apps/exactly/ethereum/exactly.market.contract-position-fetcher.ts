import { PositionTemplate } from '~app-toolkit/decorators/position-template.decorator';

import { ExactlyMarketFetcher } from '../common/exactly.market.contract-position-fetcher';

@PositionTemplate()
export class EthereumExactlyMarketFetcher extends ExactlyMarketFetcher {}
