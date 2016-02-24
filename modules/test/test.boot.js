TOM.boot.initiate( 'test', [
	{ file: '*.style.css' },
	{ file: '*.core.js', initialize: 'core.*' },
	{ file: '*.interface.js', main: true, initialize: 'interface.*' }
] );