var interface =
(function( interface )
{
	interface.test =
	{
		initialize: function( )
		{
			// Добавляем главную форму
			this.$mainBlock = $( 'body' ).append( '<div id="mainBlock"></div>' ).find( '#mainBlock' );
			
			// Кнопки управления
			this.$controls = this.$mainBlock.append( '<div id="controls">' ).find( '#controls' );
			this.$controls.append( $( '<input type="checkbox" id="use-processor"><label for="use-processor">Перехватывать создания кнопок при помощи <b>TOM.processor</b></label>' ) );
			
			// Тестовые кнопки
			this.$testButtons = this.$mainBlock.append( '<div id="testButtons">' ).find( '#testButtons' );
		}
	};

	return interface;
})( interface || {} );
