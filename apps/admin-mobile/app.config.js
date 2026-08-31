module.exports = () => {
  const base = require('./app.json').expo;
  const profile = process.env.EAS_BUILD_PROFILE || 'development';
  const updatesEnabled = profile === 'production' || profile === 'preview' || profile === 'internal';
  return {
    expo: {
      ...base,
      updates: { ...base.updates, enabled: updatesEnabled },
    },
  };
};
