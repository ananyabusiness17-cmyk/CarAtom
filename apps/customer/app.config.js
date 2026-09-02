module.exports = () => {
  const base = require('./app.json').expo;
  const profile = process.env.EAS_BUILD_PROFILE || 'development';
  const isProd = profile === 'production';
  const linkHost = isProd ? 'app.caratom.in' : 'staging.caratom.app';
  const updatesEnabled = profile === 'production' || profile === 'preview';

  return {
    expo: {
      ...base,
      updates: {
        ...base.updates,
        enabled: updatesEnabled,
      },
      ios: {
        ...base.ios,
        associatedDomains: [`applinks:${linkHost}`],
      },
      android: {
        ...base.android,
        usesCleartextTraffic: !isProd,
        intentFilters: [
          {
            action: 'VIEW',
            autoVerify: true,
            data: [{ scheme: 'https', host: linkHost, pathPrefix: '/l' }],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
      },
      extra: {
        ...base.extra,
        eas: {
          ...(base.extra && base.extra.eas),
          projectId: '9f092618-f894-4f92-b24d-00b050cf00be',
        },
      },
    },
  };
};
