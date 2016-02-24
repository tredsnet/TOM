(function( window )
{
	// Инициализируем системные области видимости
	var scopeList = [ 'core', 'interface' ];
	for( var i in scopeList )
	{
		window[ scopeList[ i ] ] = { __scopeName__: scopeList[ i ] };
	}
	
	// Инициализируем объект TOM
	var TOM = 
		window.TOM = 
	{
		_options: 
		{
			/* Контроль и логирование работы модулей
			 * Вместо каждого из пунктов можно передавать булевую true/false для передачи такого параметра и наследникам */
			debug:
			{ 
				main: true,

				boot: { // Загрузка модулей/библиотек
					log: true,
					warning: true
				},

				classes: { // Конструктор классов и наследование
					log: false,
					warning: true
				},

				processor: { // Обработчик/перехватчик событий
					log: true,
					warning: true
				},

				commutator: { // Общение с сервером			
					log: false,
					warning: true
				}
			}
		},
		
		// Клонирование объекта
		_clone: function( obj )
		{
			if( obj === null || typeof obj !== 'object'  )
			{ 
				return obj; 
			}

			// Копирование даты
			if( obj instanceof Date )
			{
				var copy = new Date( );
				copy.setTime( obj.getTime( ) );

				return copy;
			}

			// Копирование массива
			if( obj instanceof Array )
			{
				var copy = [];

				for( var i = 0, len = obj.length; i < len; ++i )
				{
					copy[i] = this._clone( obj[i] );
				}

				return copy;
			}

			// Копирование другого объекта
			if( obj instanceof Object )
			{
				var copy = {};
				for( var attr in obj )
				{
					if( obj.hasOwnProperty( attr ) )
					{
						copy[ attr ] = this._clone( obj[ attr ] );
					}
				}

				return copy;
			}

			// Ошибка
			throw new Error( 'Не удаётся скопировать объект! Не поддерживаемый формат.' );
		},
		
		_objectLength: function( obj )
		{
			var count = 0; 
			
			for( var i in obj ) { count++; };
			
			return count;
		}
	};	
	
	//= boot.js

	//= processor.js

	//= classes.js
} )( window );
