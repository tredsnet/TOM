TOM.boot.initiate( 'button', [
	{ file: '*.style.css' },
	{ file: '*.interface.js' },
	{ file: '*.core.js', require: '*.interface.js' },
	{ file: 'testButton.core.js', require: '*.core.js' }
] );