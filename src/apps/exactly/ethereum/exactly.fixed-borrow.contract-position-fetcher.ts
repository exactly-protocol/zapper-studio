import { PositionTemplate } from '~app-toolkit/decorators/position-template.decorator';

import { ExactlyFixedBorrowFetcher } from '../common/exactly.fixed-borrow.contract-position-fetcher';

@PositionTemplate()
export class EthereumExactlyFixedBorrowFetcher extends ExactlyFixedBorrowFetcher {}
