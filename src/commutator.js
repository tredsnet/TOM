// Модуль управления запросами на сервер
TOM.commutator =
{
	/*
	* @toDo: 
	* 1. Научить комутатор работать как с JSON запросами ( long polling ), так и с WebSocket 
	* 2. Ооочень не нравится текущая структура комутатора и протоколов.
	* 3. Чем выше активность пользователя, тем меньше время до следующего запроса, и наоборот
	*/ 

	callbacks: {
		onInitialize: undefined,
		onStart: undefined,
		onStop: undefined,
		onBeforeQueryCreation: undefined,
		onAfterQueryCreation: undefined,
		onSend: undefined,
		onSuccess: undefined,
		onFailed: undefined
	},

	_protocol: undefined, // Текущий протокол
	_protocols: {},		// Доступные протоколы ( классы )

	/* Запуск работы
	* @protocol {type} - [ 'HTTP', 'WebSocket' ]
	* @callbacks {array}
	* @returns protocol
	*/
	start: function( protocol, callbacks )
	{
		// Колбеки
		this.callbacks = callbacks;

		// Если необходимо сменить протокол - меняем
		if( protocol !== undefined && protocol !== '' 
				&& ( ( this._protocol !== undefined && protocol !== this._protocol.className ) || this._protocol === undefined ) )
		{
			// Удаляем связь со старым протоколом
			if( this._protocol !== undefined )
			{
				this._protocol.stop( );
				this._protocol.destroy( );
				delete this._protocol;
			}

			// Создание протокола
			var protocol = new TOM.commutator._protocols[ protocol ]( this.callbacks );

			// Проверяем инициализацию протокола
			if( protocol !== undefined )
			{
				// Перечень необходимых команд
				var availableCommands = [ 'addCommand', 'deleteCommand', 'addFile' ];

				// Копируем ссылки на необходимые функции
				for( var index in availableCommands )
				{
					var command = availableCommands[ index ];

					if( protocol[ command ] instanceof Function )
					{
						this[ command ] = 
							( function( protocol, func ) { return function( ) { return func.apply( protocol, arguments ); }; } ) 
							( protocol, protocol[ command ] );
					}
				}
			}
			else
			{
				throw new Error( 'Ошибка инициализации протокола коммутатора!' );
			}

			// Записываем текущий протокол
			this._protocol = protocol;
		}
		else
		{
			throw new Error( 'Ошибка инициализации протокола коммутатора!' );
		}

		// Возврат протокола
		return this._protocol.start( );
	},

	// Остановка работы
	stop: function( )
	{
		return this._protocol.stop( );
	}
};

/* Базовый протокол */
TOM.classes.create( 
	TOM.commutator._protocols,
	'BASE', 
	'',

	// Конструктор класса
	function constructor( callbacks )
	{
		this.queue = [];				// Очередь команд для отправки
		this.backup = {};				// Запасной буффер команд. Имеет параметры: queue и commands

		this.responseID = 0;			// ID актуального ответа от сервера
		this.resultState = 0;			// Состояние отправки
		this.errorBufferCount = 0;		// Количество ошибок от последнего нормального запроса

		this.callbacks = callbacks;		// Ссылка на список коллбеков

		// Действие до инициализации	
		if( this.callbacks.onInitialize instanceof Function )
		{
			this.callbacks.onInitialize.apply( this, [ this ] );
		}
	},

	// Запуск работы протокола
	function start( )
	{	
		// Восстановление очереди команд, не отправленных в связи с крушением браузера
		if( typeof this.backup.commands === 'string' )
		{
			this._send( this.backup.commands );
		}
		// Запуск обычного процесса коммутации ( в варианте выше его запускал  this.send )
		else
		{
			this._query( );
		}

		return this;
	},

	// Остановка работы протокола
	function stop( )
	{	
		return this;
	},

	// Уничтожение протокола
	function destroy( )
	{
		return this;
	},

	// Добавление команды в очередь отправки на сервер
	function addCommand( name, params, place )
	{
		var place = place;
		var command = {};
			command.commandName = '' + name;

		if( params instanceof Object || params instanceof Array ) // Если объект или массив
		{
			command.arguments = TOM._clone( params );
		}
		else
		{
			throw new Error( 'Ошибка при добавлении команды! Не верные входные данные!' );
		}

		// Добавляем команду в список
		this._push( 'command', command, place );
	},

	// Удалить команду из очереди
	function deleteCommand( name )
	{
		// Обрабатываем главный набор команд
		for( var i in this.queue )
		{
			var part = this.queue[i];

			if( part.type === 'command' && part.data.commandName === name )
			{
				this.queue.splice( i, 1 );
			}
		}

		// Обрабатываем бекапы
		if( this.backup !== undefined )
		{
			// Пересобираем елементы неготовой команды в бекапе
			for( var i in this.backup.queue )
			{
				var part = this.backup.queue[i];

				if( part.type === 'command' && part.data.commandName === name )
				{
					this.backup.queue.splice( i, 1 );
				}
			}

			// Пересобираем готовую команду в бекапе
			if( this.backup.commands && this.backup.commands.length > 0 )
			{
				var commandsJSON = JSON.parse( this.backup.commands );

				for( var i in commandsJSON )
				{
					if( commandsJSON[i].commandName === name )
					{
						commandsJSON.splice( i, 1 );
					}
				}

				this.backup.commands = JSON.stringify( commandsJSON );
			}
		}
	},

	// Добавление файла в очередь отправки на сервер, здесь файл - { name, type, data } - которые можно получить не хитро с помощью dataTranfer & FileReader
	function addFile( file, place )
	{
		this._push( 'file', file, place );
	},

	//
	function onSuccess( data )
	{
		this.responseID++; // Счётчик номера ответа от сервера

		// Выставляем статус - "Запрос выполнен" (хоть с ошибкой, хоть без - но выполнен)
		this.resultState = 0;
		this.errorBufferCount = 0;

		// Очищаем запасной буффер
		this.backup.queue = '';
		this.backup.commands = [];

		// Если от сервера пришёл правильно сформированный ответ
		var data = ( typeof data === 'string' ? data.toString( ) : '' );

		// Действие после удачного ответа
		if( this.callbacks.onSuccess instanceof Function )
		{
			this.callbacks.onSuccess.apply( this, [ this, data ] );
		}

		// Разбираем ответ
		if( data[0] === '[' )
		{
			data = JSON.parse( data );

			// Последовательное выполнение команд
			for( var commandID = 0; commandID < data.length; commandID ++ )
			{
				var commands = data[ commandID ].commandName.split( '.' );
				var apiMethod = window.api; // Ссылка на область видимости API
				var command = ''; // Текущая команда

				// Вызов метода API
				commandParse: while( command = commands.shift( ) )
				{
					switch( true )
					{
						// Получение запрошенного метода API
						case apiMethod[ command ] instanceof Object && apiMethod[ command ].constructor === Object:
						{
							apiMethod = apiMethod[ command ];
							break;
						}
						// Вызов метода API
						case apiMethod[ command ] instanceof Function:
						{
							apiMethod[ command ]( data[ commandID ].arguments );
							break commandParse;
						}
						// Защита от ошибок
						default:
						{
							throw new Error( 'Неизвестная команда API "' + data[ commandID ].commandName + '"' );
							break commandParse;
						}
					}
				}
			}
		}
		// Если от сервера пришёл неправильно сформированный ответ
		else
		{
			throw new Error( data );
		}

		// Запуск следующего сеанса связи
		this._query( );
	},

	//
	function onFailed( data )
	{
		// Выставляем статус - "Ошибка при запросе"
		this.resultState = -1;

		// Увеличиваем счётчик ошибок
		this.errorBufferCount++;

		// Действие после удачного ответа
		if( this.callbacks.onFailed instanceof Function )
		{
			this.callbacks.onFailed.apply( this, [ this, data ] );
		}

		// Если счётчик ошибок превышен то делаем небольшую паузу и повторяем запрос
		if( this.errorBufferCount > 3 )
		{
			var context = this;

			setTimeout( function( ){ context._send( context.backup.commands ); }, 1000 );
		}
		else
		{
			// Повторная отправка провалившегося запроса
			this._send( this.backup.commands );
		}
	},

	// Добавление в массив комманд
	function _push( type, data, place )
	{
		if( place === 'begin')
		{
			this.queue.unshift( { type: type, data: data } );
		}
		else
		{
			this.queue.push( { type: type, data: data } );
		}

		if( this.backup !== undefined )
		{
			this.backup.queue = TOM._clone( this.queue );
		}
	},

	// Оформление накопленных запросов и их отправка на сервер
	function _query( )
	{
		if( this.queue.length > 0 && this.resultState === 0 )
		{
			// Инициализация переменных
			var commands = [];
			var commandsJSON = '';

			// Действие до выполнения формирование запроса
			if( this.callbacks.onBeforeQueryCreation instanceof Function )
			{
				this.callbacks.onBeforeQueryCreation.apply( this, [ this ] );
			}

			// Формирование набора команд
			for( var id in this.queue )
			{
				switch( this.queue[ id ].type )
				{
					/*case 'file':
					{
						this.ajax.addFile( this.queue[ id ].data );

						break;
					}*/
					case 'command':
					{
						commands.push( this.queue[ id ].data );

						break;
					}
				}
			}

			// Приводим список к нужному формату
			commandsJSON = JSON.stringify( commands );

			// Очищаем списки
			// @toRefact: Проверить правильно ли работает, и возможно вернуть $.clearArray( );
			this.queue = [];
			this.backup.queue = [];

			this.buffer = commandsJSON; // Очищаем запрос и формируем список команд
			this.backup.commands = commandsJSON; // Записываем результат в бекап

			// Действие после выполнения формирования запроса
			if( this.callbacks.onAfterQueryCreation instanceof Function )
			{
				this.callbacks.onAfterQueryCreation.apply( this, [ this, commandsJSON ] );
			}

			// Отправляем команды
			this._send( commandsJSON );
		}
		else
		{
			var context = this;

			setTimeout( function( ){ context._query( ); }, 250 );
		}
	},

	//
	function _send( commandsJSON )
	{
		// Выставляем статус - "Запрос выполняется"
		this.resultState = 1;

		// Действие до выполнения запроса
		if( this.callbacks.onSend instanceof Function )
		{
			this.callbacks.onSend.apply( this, [ this, commandsJSON ] );
		}
	}
);

/* Протокол HTTP */
TOM.classes.create(
	TOM.commutator._protocols, 
	'HTTP', 
	TOM.commutator._protocols.BASE,

	// Конструктор класса
	function constructor( callbacks )
	{
		// Вызываем конструктор родителя
		this.__parentCall__( callbacks );

		// Параметры подключения к серверу
		this.apiData = { subdomain: 'api',
						responseMethod: 'POST' };

		// Объект XHR
		this._XHRObject = undefined;

		// Создаём объект для общения с сетью
		this._recreateXHR( );
	},

	// Запуск работы протокола
	function start( )
	{	
		return this.__parentCall__( );
	},

	// Остановка работы протокола
	function stop( )
	{	
		this._XHRObject.abort( );

		return this.__parentCall__( );
	},

	// Уничтожение протокола
	function destroy( )
	{
		this.stop( );
		delete this._XHRObject;
	},

	/* Выполнение отправки сформированного запроса на сервер */
	function _send( commands )
	{
		// Вызываем функцию родителя
		this.__parentCall__( );

		// 
		var url =  window.location.protocol + '//' + ( this.apiData.subdomain ? this.apiData.subdomain + '.' : '' ) + window.location.hostname + '/';
		var method = this.apiData.responseMethod;
		var timeout = 15000;

		// Параметры для формирования пакета данных
		var requestData = {
				dashes: '--', // Разделительная черта для запроса
				boundary: Math.random( ).toString( 36 ), // Разделитель
				crlf: "\r\n" // Символ переноса строки
			};

		// Проверяем  есть ли команды для отправки
		if( !commands || commands === '[]' )
		{
			return false;
		}

		// Открываем соединение и производим отправку данных
		this._XHRObject.open( method, url, true );

		// Выставление типа ответа
		this._XHRObject.responseType = 'text';

		// Смотрим есть ли данные для отправки
		var data = requestData.dashes + requestData.boundary + requestData.crlf;
			data += 'Content-Disposition: form-data; name="commands";' +  requestData.crlf + requestData.crlf + commands + requestData.crlf;
			data += requestData.dashes + requestData.boundary + requestData.dashes;

		// Устанавливаем заголовок
		this._XHRObject.setRequestHeader( 'Content-Type', 'multipart/form-data; boundary=' + requestData.boundary );

		// Отправляем запрос
		this._XHRObject.send( data );

		// Устанавливаем таймаут на отправку запроса
		// @toRefact: у XMLHttpRequest( ) есть свои методы таймаута, но по какой-то причине запустить их не удалось
		// @toRefact: Разобраться с багом возникающим при отключении сервера
		if( this.timeout )
		{
			var context = this;

			this._XHRObject.abortTimeout = setTimeout( function( ) { context.xhr.abort( ); }, this.timeout );
		}

		return this;
	},

	// Создание AJAX компонента
	function _createXHR( )
	{
		var context = this, // Ссылка на текущую область видимости
			error = null, // Переменная для вывода ошибки при создании
			XHRObject = undefined; // Удаляем ссылку на объект

		// Очищаем пакет для отправки
		this.data = '';

		// Создаём компонент AJAX исходя из доступных технологий
		if( window.XMLHttpRequest ) 
		{
		  try { XHRObject = new XMLHttpRequest( ); } catch ( e ) { error = e; };
		}
		else if( window.ActiveXObject ) 
		{
		  try { XHRObject = new ActiveXObject( 'Msxml2.XMLHTTP' ); } 
		  catch ( e ) { try { XHRObject = new ActiveXObject( 'Microsoft.XMLHTTP' ); } catch ( e ) { error = e; }; };
		}

		// Выводим ошибку если она есть
		if( error )
		{
			throw new Exception( error );	
			return;
		}

		// Таймаут для прерывания запроса
		XHRObject.abortTimeout = null; // Написано так потому что "вроде как" у XMLHttpRequest( ), есть свой таймаут. @todo: ПРОВЕРИТЬ, и переделать!

		// Функция обработки результата
		XHRObject.onreadystatechange = function( ) 
		{
			// Если запрос ещё не отработал - ничего не делаем
			if( context._XHRObject.readyState !== 4 )
			{ 
				return;
			}

			// Обнуляем таймаут соединения
			clearTimeout( this.abortTimeout ); 

			// Пересоздание компонента, так как он автоматически удаляется после выполнения запроса
			context._recreateXHR( ); 

			// Проверяем статус ответа
			if( this.status >= 200 && this.status < 400 )
			{
				var response = ( !this.responseText ) ? this.response : this.responseText;
				context.onSuccess( response/*, context._parseResponse( this.getAllResponseHeaders( ) )*/ );			
			}
			else
			{
				context.onFailed( this/*, context._parseResponse( this.getAllResponseHeaders( ) )*/ );
			}
		};

		// Возвращаем объект
		return XHRObject;
	},

	// Пересоздание компонента, так как он автоматически удаляется после выполнения запроса
	function _recreateXHR( )
	{
		this._XHRObject = this._createXHR( );

		return this._XHRObject; 
	}
);