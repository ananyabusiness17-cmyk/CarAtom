import { FlowRail, type FlowRailVariant } from './FlowRail';

export function InspectionFlowRail({ currentStep }: { currentStep: number }) {
  const variant: FlowRailVariant = 'ir';
  return <FlowRail currentStep={currentStep} variant={variant} />;
}
