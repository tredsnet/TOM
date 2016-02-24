var core =
(function( core )
{
	core.lib =
	{
		alert: function( msg ) { alert( msg ); },
		log: function( msg ) { console.log( '-- ' + msg ); }
	};

	return core;
})( core || {} );
