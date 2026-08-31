import type { ReactNode } from 'react';

import { FlowRail } from './FlowRail';
import { Screen } from './Screen';

export function VisitScreen({
  step,
  children,
  scroll = true,
}: {
  step: number;
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <Screen scroll={scroll}>
      <FlowRail currentStep={step} />
      {children}
    </Screen>
  );
}
