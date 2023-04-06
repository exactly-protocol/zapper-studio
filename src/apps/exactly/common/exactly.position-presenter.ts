import { PositionPresenterTemplate } from '~position/template/position-presenter.template';

import { ExactlyMarketProps } from './exactly.token-fetcher';

export abstract class ExactlyPositionPresenter extends PositionPresenterTemplate<ExactlyMarketProps> {
  explorePresentationConfig = {
    tabs: [
      {
        label: 'Markets',
        viewType: 'split' as const,
        views: [
          {
            viewType: 'split' as const,
            label: 'Deposit',
            views: [
              { viewType: 'list' as const, label: 'Variable', groupIds: ['deposit'] },
              { viewType: 'list' as const, label: 'Fixed', groupIds: ['fixed-deposit'] },
            ],
          },
          {
            viewType: 'split' as const,
            label: 'Borrow',
            views: [
              { viewType: 'list' as const, label: 'Variable', groupIds: ['borrow'] },
              { viewType: 'list' as const, label: 'Fixed', groupIds: ['fixed-borrow'] },
            ],
          },
        ],
      },
    ],
    // tabs: [{ label: 'Markets', viewType: 'list' as const, groupIds: ['market'] }],
  };
}
