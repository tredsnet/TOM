var core =
(function( core )
{
	TOM.classes.create
	( 
		core, 
		'TestButton', 
		core.Button, 
		
		// Конструктор
		function constructor( selector  )
		{
			// Вызываем создание родителя
			this.__parentCall__( '-- Тестовая кнопка --', selector ); 
			
			// Меняем класс кнопки
			this.interface.area.addClass( 'test-button' );
			
			// Скрываем кнопку при клике
			var context = this;
			this.interface.area.on( 'click', function( ) { context.hide( 500 ); } );
		}
	);

	return core;
})( core || { } );