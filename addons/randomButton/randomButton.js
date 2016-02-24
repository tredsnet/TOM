var core = 
(function( core )
{
	core.randomButton =
	{
		// Функция инициализации
		initialize: function( )
		{
			// Добавляем обработчик события
			TOM.processor.bind( 'post-core.TestButton.constructor', function( sender )
			{
				var rand =  Math.floor( Math.random( ) * 3 );
				
				if( rand === 0 )
				{
					this.interface.area.css( 'background-color', 'red' )
										.css( 'color', 'white' );
				}
				else if( rand === 1 )
				{
					this.interface.area.css( 'background-color', 'yellow' )
										.css( 'color', 'black' );
				}
				
				if( Math.floor( Math.random( ) * 2 ) === 1 )
				{
					this.interface.area.html( this.interface.area.html( ) + ' ___ ' + Math.random( ).toString( 36 ) );
				}
				
				if( Math.floor( Math.random( ) * 2 ) === 1 )
				{
					this.interface.area.css( 'height', '40px' );
				}
			} );
			
			// Обрабатываем событие "удаления аддона"
			TOM.processor.one( 'post-core.test.removeAddon', this.destroy );
			
			// Выводим уведомление
			core.lib.alert( 'Теперь при добавлении новых кнопок - они будут иметь случайный внешний вид!' );
		},
		
		// Функция "уничтожения"
		destroy: function( )
		{
			// Выводим уведомление
			core.lib.alert( 'Аддон выгружен!' );
			
			// Убираем обработчик
			TOM.processor.unbind( 'post-core.TestButton.constructor' );
		}
	};
	
	return core;
})( core || {} );
