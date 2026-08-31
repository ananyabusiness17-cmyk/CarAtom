import { concernForKind } from './jobConcern';

if (concernForKind('gs') !== 'General service requested') {
  throw new Error('GS concern copy drifted');
}
if (concernForKind('gpr') !== 'Service plus selected repairs') {
  throw new Error('GPR concern copy drifted');
}
if (concernForKind('ir', '  rattle  ') !== 'rattle') {
  throw new Error('IR symptoms should trim');
}
if (concernForKind('ir') !== 'Please inspect') {
  throw new Error('IR empty symptoms fallback');
}

console.log('createFlowJobCard helpers OK');
