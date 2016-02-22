TOM.boot.initiate( 'test', [
	{ file: '*.schema.css' },
	{ file: '*.core.js', initialize: 'core.*' },
	{ file: '*.interface.js', main: true, initialize: 'interface.*' }
] );