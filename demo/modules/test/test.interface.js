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
			this.$controls.append( $( '<input type="checkbox" id="use-processor"><label for="use-processor">Перехватывать создание кнопок при помощи процессора</label>' ) );
			
			// Тестовые кнопки
			this.$testButtons = this.$mainBlock.append( '<div id="testButtons">' ).find( '#testButtons' );
		},
		
		show: function( )
		{
			this.$mainBlock.css( 'display', 'block' );
		},
		
		hide: function( )
		{
			this.$mainBlock.css( 'display', 'none' );
		},
		
		addButton: function( caption, callback )
		{
			var button = this.$testButtons.append( $( '<div class="button">' + caption + '</div>' ) );
			
			if( callback instanceof Function )
			{
				button.on( 'click', callback );
			}
			
			return button;
		}
	};

	return interface;
})( interface || {} );
