import { useLocalSearchParams } from 'expo-router';

import { RepairsCartScreen } from '../../../src/components/RepairsCartScreen';
import { firstParam } from '../../../src/lib/routeParam';

export default function JobRepairsCart() {
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  return <RepairsCartScreen jobCardId={firstParam(params.id)} mode={firstParam(params.mode) || undefined} />;
}
