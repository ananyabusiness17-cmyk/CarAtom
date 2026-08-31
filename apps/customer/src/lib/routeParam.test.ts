import { firstParam } from './routeParam';

if (firstParam(undefined) !== '') {
  throw new Error('undefined should be empty');
}
if (firstParam('jc-1') !== 'jc-1') {
  throw new Error('string param should pass through');
}
if (firstParam(['jc-1', 'jc-2']) !== 'jc-1') {
  throw new Error('array param should use the first value');
}

console.log('routeParam OK');
