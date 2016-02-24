var core =
(function( core )
{
	core.test =
	{
		initialize: function( )
		{
			// Делаем ссылку на интерфейс
			this.interface = interface.test;
						
			// Создаём ссылку на текущий контекст
			var context = this;
			
			// Добавляем кнопки управления
			new core.Button( 'Добавить кнопку', this.interface.$controls, function( ) { context.addTestButton( context.interface.$testButtons ); } );
			
			// Загрузить аддон случайного изменения кнопок
			this.addonButton = new core.Button( 'Загрузить аддон "randomButton"', this.interface.$controls, function( ) 
			{ 
				TOM.boot.load( 'addons/*', 'randomButton', function( )
				{
					// Меняем действие при нажатии на кнопку
					context.addonButton.interface.area.html( 'Выгрузить аддон "randomButton"' )
														.off( )
														.on( 'click', function( ) { context.removeAddon( ); } );
				} );		
			} );

			// Добавляем обработчик события
			TOM.processor.bind( 'pre-core.test.addTestButton', function( sender )
			{
				// Выводим лог
				core.lib.log( 'Сработало действие "core.test.addTestButton"' );

				// Если чекбокс отмечен - переспрашиваем
				if( $( '#use-processor' ).is( ':checked' ) )
				{
					core.lib.log( 'Перехватили действие "core.test.addTestButton"' );
					
					// Если мы не хотим на самом деле создавать кнопку - прерываем её создание
					if( !confirm( 'Действительно создать кнопку?' ) )
					{
						return false;
					}
				}
			} );
		},
		
		addTestButton: function( selector )
		{
			return new core.TestButton( selector );
		},
		
		removeAddon: function( )
		{
			this.addonButton.destroy( );
		}
	};

	return core;
} )( core || {} );
