Package.describe({
  name: 'ronenm:currency',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.3.1');
  api.use("sgi:sprintfjs");
  api.use("http");
  api.use("underscore");
  api.use([
    'blaze',
    'spacebars',
    'templating'
  ], 'client');
  api.addFiles('lib/currency.js');
  api.addFiles('lib/money.js');
  api.addFiles('lib/exchange.js');
  api.addFiles('lib/reactivity.js','client');
  api.addFiles('templates/currency.html','client');
  api.addFiles('templates/currency.js','client');
  api.export('Currency');
  api.export('Money');
  api.export('Exchange');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('ronenm:currency');
  api.addFiles('ronenm:currency-tests.js');
});
