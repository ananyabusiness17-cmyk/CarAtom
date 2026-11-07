import { assertGlossary, MODE_TABS } from './modeTabs';

assertGlossary();

if (MODE_TABS[0]?.label !== 'General service + add-ons') {
  throw new Error('Expected General service + add-ons first');
}

if (MODE_TABS.length !== 3) {
  throw new Error('Home must render three mode tabs');
}

if (MODE_TABS.some((tab) => tab.label === 'General service')) {
  throw new Error('Standalone General service tab must stay removed');
}

if (MODE_TABS[1]?.label !== 'One-man job') {
  throw new Error('Expected One-man job second');
}

if (MODE_TABS[0]?.folderLines[1] !== '+ add-ons') {
  throw new Error('First folder tab must read General service + add-ons');
}

console.log('modeTabs glossary OK');
