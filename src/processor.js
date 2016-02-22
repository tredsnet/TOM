// Проксирование функций
TOM.processor =
{
	// Параметры отладки
	_debug: TOM._options.debug.processor,

	// Список "обработчиков"
	_handlers: [],

	// Установка обработчика событий на выполнение функций/сигналов
	bind: function( name, handler, params )
	{
		// Обработка не верных данных
		if( typeof handler === 'undefined' || typeof handler.constructor !== 'function' )
		{
			throw new Error( 'TOM.processor.bind: Подана не верная функция-обработчик - ' + name );
			return;
		}

		// Инициализируем параметры
		var params = params || { priority: '' };

		// Если в качестве имени у нас строка - проверяем не записано ли там несколько имён
		if( typeof name === 'string' && ( name.indexOf( ' ' ) > -1 || name.indexOf( ',' ) > -1 ) )
		{
			var names = ( name.indexOf( ' ' ) > -1 && name.indexOf( ',' ) <= 0 ) ? name.split( ' ' ) : name.split( ',' );

			for( var i in names )
			{
				this.bind( names[i].trim( ), handler, params );
			}
		}
		else
		{
			var stage = params.stage || 'pre',
				label = ( params.label ) ? params.label : handler.name,
				priority = ( params.priority !== undefined ) ? 
							params.priority : 
							( ( typeof params === 'string' ) ? params : '' );

			// Если у нас состояние выставлено непосредственно в строке - ему и приоритет
			if( typeof name === 'string' )
			{
				if( name.indexOf( 'post-' ) === 0 )
				{
					var name = name.substr( 5, name.length );
					stage = 'post';
				}
				else if( name.indexOf( 'pre-' ) === 0 )
				{
					var name = name.substr( 4, name.length );
				}
			}

			// Проверка наличия имён
			if( name === undefined || name === '' )
			{
				throw new Error( 'TOM.processor.bind: Подано не верное имя обрабатываемой функции - ' + name );
				return;
			}
			// Смотрим чтоб в названии небыло кирилических символов
			else if( ( /^([а-яА-Я])/gi ).test( name ) )
			{
				throw new Error( 'TOM.processor.bind: Подано имя обрабатываемой функции с кирилическими символами - ' + name );
				return;
			}

			// Проходим по списку уже записанных данных, и смотрим не сделаем ли мы "повторное" навешивание
			for( var i in this._handlers[ name ] )
			{
				if( this._handlers[ name ][i] === handler )
				{
					if( this._debug.warning ) // Выводим сообщение о том что повторно навешиваемся ( необходимо для дебага )
					{
						console.warn( 'TOM.processor.bind: Повторяющийся слушатель - ' + name );
					}

					return;
				}
			}

			// Проверяем существует ли вообще функция на которую мы хотим - "навеситься" ( необходимо для дебага )
			if( this._debug.warning )
			{
				var error = false;

				// Пытаемся вызвать функцию
				try { if ( typeof eval( name ) === 'undefined' ) { error = true; } }
				catch( e ) { error = true; };

				// В случае ошибки - вначале проверяем данное имя в классах
				if( error )
				{
					for( var i in TOM.classes._list )
					{
						if( name.indexOf( i ) === 0 /*&& TOM.classes._list[i][ name ] instanceof Function*/ ) 
						{ 
							// @todo: Необходимо проверять так-же существование самой вызываемой функции, а не только класса
							error = false;
							break; 
						}
					}
				}

				// Если ничего не вышло, сообщаем об этом консоль
				if( error )
				{	
					console.warn( 'TOM.processor.bind: Слушатель цепляется на несуществующую ( или ещё не инициализированную ) функцию - ' + name );
				}
			}

			// Если навешивания на такую процедуру ещё небыло - создаём значение массива
			if( this._handlers[ name ] === undefined )
			{
				this._handlers[ name ] = [];
			}

			// Добавляем обработчик в список
			this._handlers[ name ].push( { handler: handler, stage: stage, label: label, priority: priority } );
		}
		
		return this;
	},

	// Снятие обработчика событий
	unbind: function( name, handler, params )
	{
		var params = params || {},
			stage = params.stage || 'pre';

		// Если у нас состояние выставлено непосредственно в строке - ему и приоритет
		if( typeof name === 'string')
		{
			if( name.indexOf( 'post-' ) === 0 )
			{
				var name = name.substr( 5, name.length );
				stage = 'post';
			}
		}

		// Смотрим чтоб в названии небыло кирилических символов
		if( ( /^([а-яА-Я])/gi ).test( name ) )
		{
			throw new Error( 'TOM.processor.unbind: Подано название с кирилическими символами - ' + name );
		}

		// Смотрим есть ли handler такого события
		if( this._handlers[ name ] !== undefined )
		{
			for( var i in this._handlers[ name ] )
			{
				var mainHandler = ( typeof handler === 'string' ) ? ( this._handlers[ name ][i].label || this._handlers[ name ][i].handler.name ) : this._handlers[ name ][i].handler,
					checkHandler = ( ( ( typeof handler === 'string' || typeof handler === 'function' ) && mainHandler === handler ) || handler === undefined ) ? true : false;

				if( checkHandler && this._handlers[ name ][i].stage === stage )
				{
					this._handlers[ name ].splice( i, 1 );
				}
			}

			// Если на это событие больше никто не навешан - убираем
			if( this._handlers[ name ].length <= 0 )
			{
				delete this._handlers[ name ];
			}
		}
		
		return this;
	},

	// Установка "одноразового" обработчика события
	one: function( name, handler, params )
	{
		var context = this,
			timeHash = $.toString( new Date( ).getTime( ) ),
			params = params || {};
			params.label = ( ( params.label !== undefined && params.label !== '' ) ? params.label : timeHash );

		// Функция снимающая обработчик после выполнения
		var	oneHandler = function( )
			{
				context.unbind( name, params.label, params );
				return handler.apply( context, arguments ); // @todo: проверить передаваемые данные
			};

		// Добавляем обработчик
		this.bind( name, oneHandler, params );
		
		return this;
	},

	// Сигнал для обработчиков
	signal: function( stage, name, sender, args )
	{
		// 
		if( name === '' )
		{
			return;
		}
		else if( this._handlers[ name ] === undefined )
		{
			return this;
		}

		// Сортируем обработчики по приоритету
		this._handlers[ name ].sort( function( a, b )
		{
			if( a.priority === 'begin' && b.priority !== 'begin' ) { return 1; }
			else if( a.priority !== 'begin' && b.priority === 'begin' ) { return -1; }

			return 0;
		} );

		// Проходим по всем имеющимся обработчикам
		for( var i in this._handlers[ name ] )
		{
			if( typeof this._handlers[ name ][i].handler === 'function' && this._handlers[ name ][i].stage === stage )
			{
				var handler = this._handlers[ name ][i].handler, // Вызываемый метод
					label = this._handlers[ name ][i].label, // 
					returnParam = '', // Результат выполнения
					command = ''; // Переменная для распознания результата

				// Выполняем вызов от имени "вызывающего метода"
				if( sender !== undefined )
				{
					// Обрабатываем "вызывающий метод"
					// @toRefact: Не правильно дописывать к объекту свою переменную. Придумать что-то другое.
					sender._callMethod_ = name;

					// Выполняем вызов
					returnParam = handler.apply( sender, [ sender, args ] );

					// Удаляем имя вызывающего метода
					delete sender._callMethod_;
				}
				// Если не выходит от "вызываюшего метода", делаем просто вызов
				else
				{
					returnParam = this._handlers[ name ][i].handler( { _callMethod_: name }, args );
				}
				
				/* Если в результате пришла булевая переменная - записываем её как команду
					returnParam:
					true - снимаем обработчик
					false - прерываем дальнейшую обработку */
				if( typeof returnParam === 'boolean' )
				{
					command = ( returnParam === false ) ? 'break' : 'unbind';
				}
				// ... если string - разбиваем результат на параметры
				else if( typeof returnParam === 'string' ) 
				{
					command = ( returnParam ) ? returnParam.split( ' ' ) : '';
					// command = ( returnParam.indexOf( ' ' ) > -1 && returnParam.indexOf( ',' ) <= 0 ) ? returnParam.split( ' ' ) : returnParam.split( ',' );
				}

				// Делаем unbind - если это необходимо
				if( command.indexOf( 'unbind' ) > -1 )
				{
					// Производим unbind
					this.unbind( name, this._handlers[ name ][i].handler, { stage: this._handlers[ name ][i].stage, label: label } );

					// Выводим сообщение о том что мы прервали bind ( необходимо для дебага )
					if( this._debug.log ) 
					{
						console.info( 'TOM.processor: Контролируемый unbind - ' + name + ( label !== '' ? ', ( метка: ' + label + ' )' : '' ) );
					}
				}

				// Передаём данные о прерывании - дальнейшей работы обработчика
				if( command.indexOf( 'break' ) > -1  )
				{
					// Выводим сообщение 
					if( this._debug.log ) 
					{
						console.info( 'TOM.processor: Прерываем дальнейшее выполнение обработчика - ' + name + ( label !== '' ? ', ( метка: ' + label + ' )' : '' ) );
					}

					// Прерываем дальнейшую обработку
					return false;
				}
			}
		}

		return this;
	},

	/* Проксирование
	* @object - 
	* @parent -
	*/
	proxy: function( object, parent, any )
	{
		var context = this;

		this._proxyObject
		(
			object,
			function( method, methodName )
			{
				// Защита от проксирования себя самого, и повторного проксирования
				if( methodName.indexOf( 'window.processor' ) > -1 || method.__proxy__ )
				{
					return;
				}

				// Записываем что этот метод/объекта уже проксировался
				method.__proxy__ = true;

				// Проксируем методы из прототипа метода
				var prototypeCount = 0;
				for( var proto in method.prototype ) { prototypeCount++; }

				// Если это "Класс" проходим по всему содержимому
				if( method.__isClass__ && prototypeCount > 0 )
				{
					// Проксируем методы класса ( только функции )
					for( var name in method.prototype )
					{
						// Имя функции
						var proxyName = methodName + '.' + name;

						// Пробуем проксировать родителя
						/* if( name === '_parent_' )
						{
							context.proxy( method.prototype[ name ], proxyName, true );
							continue;
						} */

						// Конструктор и всё связанное с наследованием - пропускаем
						if( typeof method.prototype[ name ] !== 'function'
							|| name === '__checkClassName__'
							|| name.indexOf( '__parent' ) === 0 ) 
						{
							continue;
						}

						method.prototype[ name ] = context._signalProxy( method.prototype[ name ], proxyName );

					}
				}
				else
				{
					return context._signalProxy( method, methodName );
				}
			},
			parent,
			undefined,
			any
		);

		return this;
	},

/* "Приватные" методы */

	// Проксирование методов конкретного объекта переданной оберткой ( оно глубокое )
	_proxyObject: function( object, proxyCallback, parent, args, any )
	{
		// Глубокое проксирование ( проксируем только стандартные объекты )
		if( object instanceof Object && ( any || object.constructor === Object ) )
		{
			// Проходим по содержимому объекта
			for( var member in object )
			{
				var parentName = object.__scopeName__ || object.__className__ || parent;

				// Проверяем имя объекта
				if( !parentName )
				{
					throw new Exception( 'TOM.processor: Ошибка при проксировании объекта. Не указано имя родительского объекта!' );
				}

				// Проксируем содержимое
				if( typeof object[ member ] === 'function' )
				{
					object[ member ] = proxyCallback( object[ member ], ( parentName ? parentName + '.' : '' ) + member, args ) || object[ member ];
				}
				// Рекурсивно пытаемся проксировать все, что под рукой
				else
				{
					this._proxyObject( object[ member ], proxyCallback, ( parentName ? parentName + '.' : '' ) + member, args );
				}
			}
		}
	},

	// Конкретный прокси для того, чтобы добавить сигналирование методу
	_signalProxy: function( method, methodName )
	{
		var context = this,
			method = method,
			methodName = methodName,
			callback = function( )
			{			
				// Вызываем предобработчики
				if( context.signal( 'pre', methodName, this, arguments ) !== false )
				{	
					var mainResult = method.apply( this, arguments ), // Вызываем основную процедуру
						postResult = context.signal( 'post', methodName, this, arguments ); // Вызываем постобработчик
						// @todo: добавить возможность подмены результата в постобработчике

					return mainResult;
				}
			};

			return callback;
	}
};