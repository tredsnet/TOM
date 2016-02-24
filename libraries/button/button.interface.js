var interface =
(function( interface )
{
	TOM.classes.create
	(
		interface, 
		'Button', 
		'', 
		
		// Конструктор
		function constructor( caption, selector )
		{
			this.area = $( '<div class="button" style="display: none;">' + caption + '</div>' );
			this.area.appendTo( $( selector ) );
			
			return this;
		},

		// Показ
		function show( fadeSpeed )
		{
			this.area.fadeIn( fadeSpeed || 0 );

			return this;
		},

		// Скрытие
		function hide( fadeSpeed )
		{
			this.area.fadeOut( fadeSpeed || 0 );

			return this;
		},

		// Удалить оснастку
		function destroy( )
		{
			this.area.remove( );

			return this;
		}
	);

	return interface;
})( interface || { } );
