import { assertGlossary, MODE_TABS } from './modeTabs';

assertGlossary();

if (MODE_TABS[0]?.label !== 'General service + repair') {
  throw new Error('Expected General service + repair first');
}

if (MODE_TABS[1]?.label !== 'General service') {
  throw new Error('Expected General service second');
}

if (MODE_TABS[0]?.folderLines[1] !== '+ repair') {
  throw new Error('First folder tab must read General service + repair');
}

console.log('modeTabs glossary OK');
