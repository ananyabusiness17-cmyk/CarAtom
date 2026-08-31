import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import type { FlowRailVariant } from '../components/FlowRail';
import { useJobCardFlowStore } from '../stores/jobCardFlowStore';

export function useFlowRail(gsStep: number, gprStep: number, onemanStep = gsStep, irStep = gsStep) {
  const params = useLocalSearchParams<{ flow?: string }>();
  const flowKind = useJobCardFlowStore((s) => s.flowKind);
  const setFlowKind = useJobCardFlowStore((s) => s.setFlowKind);
  const isGpr = params.flow === 'service-repair' || flowKind === 'gpr';
  const isOneman = params.flow === 'oneman' || flowKind === 'oneman';
  const isIr = params.flow === 'ir' || flowKind === 'ir';

  useEffect(() => {
    if (params.flow === 'service-repair') setFlowKind('gpr');
    if (params.flow === 'oneman') setFlowKind('oneman');
    if (params.flow === 'ir') setFlowKind('ir');
  }, [params.flow, setFlowKind]);

  const variant: FlowRailVariant = isIr ? 'ir' : isOneman ? 'oneman' : isGpr ? 'gpr' : 'gs';
  const currentStep = isIr ? irStep : isOneman ? onemanStep : isGpr ? gprStep : gsStep;

  return {
    variant,
    currentStep,
    isGpr,
    isOneman,
    isIr,
    flowParam: isIr
      ? { flow: 'ir' }
      : isOneman
        ? { flow: 'oneman' }
        : isGpr
          ? { flow: 'service-repair' }
          : {},
  };
}
