( function( window )
{
	/* Инициализируем системные области видимости
	 */
	var scopeList = [ 'core', 'interface' ];
	for( var i in scopeList )
	{
		window[ scopeList[ i ] ] = { __scopeName__: scopeList[ i ] };
	}
	
	/* Инициализируем объект TOM
	 */
	var TOM = 
		window.TOM = 
	{
		/* Спец. параметры для модулей
		 */
		_options: 
		{
			// Загрузка модулей/библиотек
			boot: { 
				log: true,
				warning: true,
				allowEvents: [ 'complete' ]
			},
			// Конструктор классов и наследование
			classes: { 
				log: false,
				warning: true,
				allowEvents: [ 'create', 'pre-constructor', 'post-constructor' ]
			},
			// Обработчик/перехватчик событий
			processor: { 
				log: true,
				warning: true,
				allowEvents: [ ]
			},
			// Общение с сервером		
			commutator: { 	
				log: false,
				warning: true,
				allowEvents: [  ]
			}
		},
		
		/* Список функций с обратным вызовом
		 */
		_callbackList: [ ],
		
		/* Клонирование объекта
		 * 
		 * @param {type} obj
		 * @returns {Array|main_L1._clone.copy|window.TOM._clone.copy}
		 */
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
		
		/* Подтсчёт размера объекта/массива
		 * 
		 * @obj {объект|массив}
		 * @returns {число}
		 */ 
		_objectLength: function( obj )
		{
			var count = 0; 
			
			for( var i in obj ) { count++; };
			
			return count;
		},
		
		/* Логирование
		 * 
		 * @module {строка} - вызывающий модуль
		 * @type {строка} - тип сообщения
		 * @msg {строка} - сообщение
		 * @returns {}
		 */
		_log: function( module, type, msg )
		{
			// Пытаемся вызвать коллбек
			if( this._callbackList !== undefined && this._callbackList[ 'log' ] instanceof Function )
			{
				this._callbackList[ 'log' ].apply( this, [ type, msg ] );
			}
			// Если функции нет - и нужно логирование - выводим данные в консоль
			else if( this._options[ module ].log && window.console !== undefined )
			{
				console[ type ]( msg );
			}
			
			return this;
		},

		/* Вывод исключения/ошибки
		 * 
		 * @module {строка} - вызывающий модуль
		 * @errorMsg {строка} - сообщение об ошибке
		 * @errorObj {объект} - объект ошибки
		 * @returns {}
		 */
		_error: function( module, errorMsg, errorObj )
		{
			// Формируем сообщение
			var msg = ( errorObj !== undefined && errorObj.data !== undefined ) ? 'Ошибка ( "' + errorMsg + '" ) - "' + errorObj.data.src + '".' : errorMsg;

			// Вызов обработчика если он есть
			if( this._callbackList !== undefined && this._callbackList[ 'error' ] instanceof Function )
			{
				this._callbackList[ 'error' ].apply( this, [ msg, errorObj ] );
			}
			// Вызов ошибки
			else
			{
				throw new Error( msg, errorObj );
			}
			
			return this;
		},
		
		/* Обрабтка событий
		 * События устанавливаются единоразово ( затираются при новой установке )
		 * 
		 * @allowEvents {строка} - разрешённые имена событий
		 * @event {строка} - событие которое необходимо обрабатывать
		 * @callback {функция} - обработчик
		 * @returns {}
		 */
		_callback: function( module, event, callback )
		{
			var allowEvents = ( this._options[ module ].allowEvents || [] ).concat( [ 'log', 'error' ] );
			
			// Проверяем входящие данные
			if( ( allowEvents.indexOf( event ) < 0 )
				|| !( callback instanceof Function ) )
			{
				this.error( 'Ошибка при установке обработчика событий!' );
				return;
			}

			// Добавляем обработчик событий
			return this._callbackList.push( { module: module, event: event, callback: callback } );
		},

		/* Вызов обработчика событий
		 * 
		 * @module {строка} - имя модуля
		 * @event {строка} - событие которое необходимо вызвать
		 * @returns {}
		 */
		_triggerCallback: function( module, event, args, context )
		{
			for( var i in this._callbackList )
			{
				if( this._callbackList[ i ].module === module && this._callbackList[ i ].event === event )
				{
					if( this._callbackList[ i ].callback instanceof Function )
					{
						this._callbackList[ i ].callback.apply( ( context instanceof Object ? context : TOM[ module ] ), args );
					}
				}
			}
			
			return this;
		},
		
		/* Снятие обработчика событий
		 * 
		 * @event {строка} - событие которое необходимо обрабатывать
		 * @returns {}
		 */
		_removeCallback: function( event )
		{
			delete this._callbackList[ event ];
			return this;
		}
	};	

	//=include boot.js

	//=include processor.js

	//=include classes.js

	//=include commutator.js

	// Дополнительные обработчики для лучшей связи между модулями
	if( TOM.classes !== undefined && TOM.processor !== undefined )
	{
		TOM.classes.callback( 'create', function( newClass ) { TOM.processor.proxy( newClass, newClass.__classFullName__ ); } );
		TOM.classes.callback( 'pre-constructor', function( constructorFullName, args ) { TOM.processor.signal( 'pre', constructorFullName, this, args ); } );
		TOM.classes.callback( 'post-constructor', function( constructorFullName, args ) { TOM.processor.signal( 'post', constructorFullName, this, args ); } );
	}
} )( window );
