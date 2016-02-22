var core =
(function( core )
{
	core.test =
	{
		initialize: function( )
		{
			// Делаем ссылку на интерфейс
			this.interface = interface.test;
			
			// Отображаем интерфейс
			this.show( );
			
			// Добавляем кнопки управления
			var context = this;
			$( '<div class="button">Добавить тестовую кнопку</div>' ).appendTo( this.interface.$controls )
									.on( 'click', function( ) { context.addButton( '-- Тестовая кнопка --' ); } );
							
			/*
			 $( '<div class="button">Загрузить модуль "commutator"</div>' ).appendTo( this.interface.$controls )
									.on( 'click', function( ) {  } );
			*/
			
			// Добавляем обработчик события
			TOM.processor.bind( 'pre-core.test.addButton', function( sender )
			{
				// Выводим лог
				core.lib.log( 'Сработало действие "core.test.addButton"' );

				// Если чекбокс отмечен - переспрашиваем
				if( $( '#use-processor' ).is( ':checked' ) )
				{
					core.lib.log( 'Перехватили действие "core.test.addButton"' );
					
					// Если мы не хотим на самом деле создавать кнопку - прерываем её создание
					if( !confirm( 'Действительно создать кнопку?' ) )
					{
						return false;
					}
				}
			} );
		},

		show: function( )
		{
			this.interface.show( );
			
			return this;
		},
		
		hide: function( )
		{
			this.interface.show( );
			
			return this;
		},
		
		addButton: function( caption, callback )
		{
			return this.interface.addButton( caption, callback );
		}
	};

	return core;
})( core || {} );
