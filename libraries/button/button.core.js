var core =
(function( core )
{
	TOM.classes.create
	( 
		core, 
		'Button', 
		'', 
		
		// Конструктор
		function constructor( caption, selector, callback )
		{
			// Работаем с интерфейсом
			this.interface = new interface.Button( caption, selector );
			
			// Отображаем кнопку
			this.show( );
			
			// Прописываем реакцию на клик
			if( callback instanceof Function )
			{
				this.interface.area.on( 'click', callback );
			}
		},
		
		// Показ
		function show( fadeSpeed )
		{
			this.interface.show( fadeSpeed );

			return this;
		},

		// Скрытие
		function hide( fadeSpeed )
		{
			this.interface.hide( fadeSpeed );

			return this;
		},

		// Удалить оснастку
		function destroy( )
		{
			this.interface.destroy( );

			return this;
		}
	);

	return core;
})( core || { } );
