/*!
 * TOM - treds operating module 
 * https://github.com/tredsnet/TOM/
 * http://treds.net
 *
 * Developers:
 * Borisenko V.
 *
 * Released under the Apache 2 license
 *
 * Date:
 * 30.06.2015
 */

(function( window )
{
	// Инициализируем системные области видимости
	var scopeList = [ 'api', 'core', 'interface' ];
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
	
	// Динамическая загрузка библиотек/модулей
	TOM.boot =
	{
		/*
		 * @ToDO:
		 * 1. ? Сделать callback окончания полной загрузки всех модулей ( после того как убедились что всё загрузили - сами вызываем boot.Complete - и срабатывает колбек )
		 * 2. ? Инициализировать скрипты только после полной загрузки всех модулей.
		 * 3. ? Сделать параметр инициализации приложения - "по окончанию загрузки" ( инициализировать когда сработал - boot.complete )
		 * 4. ? Загружать вначале модули/файлы без зависимостей
		 * 5. ? Ускорить работу _requireCheck
		 * 6. ? Добавить проверку на существование модуля/файла из списка зависимостей
		 * 7. Инициализация должна проходить с учётом зависимостей
		 */
	
		/* @toRefact: 
		 * Сделать проверку на рекурсию зависимостей.
		 * Как например здесь: 
		 * TOM.boot.initiate( 'navigator', [
			{ file: '*.core.js', main: true, require: [ 'localization', '*.interface.js' ], initialize: 'core.*' },
			{ file: '*.interface.js', require: 'area', initialize: 'interface.*' },
		 */
	
		 /* Загрузку скриптов можно производить несколькими способами
		  * 
		  *	1 способ, задача: загрузить /addons/jquery/jquery.boot.js
		  * TOM.boot.load( addons/*', 'jquery', function( ){ } );
		  *
		  * 2 способ, задача: загрузить /jquery/jquery.boot.js
		  * TOM.boot.load( '*', 'jquery',  function( ){ } );
		  * 	
		  * 3 способ, задача: загрузить /jquery.boot.js
		  * TOM.boot.load( '', 'jquery', function( ){ } );
		  * 
		  * 4 способ, задача: загрузить /jquery.js
		  * TOM.boot.load( '', 'jquery.js', function( ){ } );
		  * 
		  * 5 способ, задача: загрузить https://code.jquery.com/jquery-1.12.0.min.js
		  * TOM.boot.load( '', 'https://code.jquery.com/jquery-1.12.0.min.js', function( ){ } );
		  */
	
		// Параметры отладки
		_debug: TOM._options.debug.boot, 
	
		// Общий список модулей со всеми данными
		_moduleList: [],
	
		// Список состояния загрузки модулей
		_moduleLoadedStates: [],
	
		// Список состояния загрузки файлов
		_fileLoadedStates: [],
	
		// Колбек должен вызваться только после полной загрузки всех модулей из данного списка
		_callbackList: [],
	
		// Мониторинговый таймер который будет уведомлять если какие-то модули ещё не загрузились
		_monitoringTimer: undefined,
	
		// Настройки
		_options: {
			baseURL: '', // Путь по которому находятся скрипты
			cache: true // Разрешено ли кеширование скриптов
		},
	
		// Логирование при debug.boot = true
		log: function( args )
		{
			if( this._debug.log && window.console !== undefined )
			{
				console.log( args );
			}
		},
	
		// Ошибка
		error: function( state, e )
		{
			if( e !== undefined && e.data !== undefined )
			{
				throw new Error( 'TOM.boot: Ошибка ( "' + state + '" ) при загрузке файла - "' + e.data.src + '".', e );
			}
			else
			{
				throw new Error( state );
			}
		},
	
		/* Установка параметров скрипта
		 * 
		 * @option {строка} - ключ
		 * @value {строка/объект/массив} - значение
		 */
		options: function( option, value )
		{
			if( this._options[ option ] !== undefined )
			{
				this._options[ option ] = value;
			}
	
			return this;
		},
	
		/* Загрузка модулей
		 * 
		 * @dir {строка} -
		 * @names {строка/массив} -
		 * @callback {функция} -
		 * @returns {}
		 */
		load: function( dir, names, callback )
		{
			// Формирование списка
			var context = this,
				names = names instanceof Array ? names : [ names ],
				loadList = this._prepareModuleList( names, dir );
	
			// Проходим по списку загрузок
			for( var i in loadList )
			{
				// Считываем данные
				var moduleData = loadList[i];
	
				// Копируем полученные данные в массив
				this._moduleList[ moduleData.name ] = TOM._clone( loadList[i] );
	
				// Записываем состояние загрузки модуля
				this._moduleLoadedStates[ moduleData.name ] = 'none';
	
				// Загружаем нужные загрузочные файлы файлы
				this._loadScriptOrStyle( { module: moduleData.name, type: 'js', file: moduleData.boot }, function( ) 
				{
					if( moduleData.name === moduleData.boot )
					{
						context._afterLoadCheck( moduleData.name ); 
					}
				} );
			}
	
			// Формируем список для колбека
			// Колбек должен вызваться только после полной загрузки всех модулей из списка modules
			this._callbackList.push( { modules: names, callback: callback } );
	
			// Запускаем мониторинговый таймер если он ещё не запущен
			if( context._monitoringTimer === undefined )
			{
				this._monitoringTimer = setTimeout( function checkNotLoadTimerFunc( )
				{
					if( context._checkNotLoad( ) )
					{
						context._monitoringTimer = setTimeout( checkNotLoadTimerFunc, 10000 ); 
					}
					else
					{
						context._monitoringTimer = undefined;
					}
				},
				10000 );
			}
	
			//
			return this;
		},
	
		/* Загрузка и инициализация файлов модуля
		 * 
		 * @moduleName {строка} - 
		 * @loadList {массив} -
		 * @returns {initiate}
		 */
		initiate: function( moduleName, loadList )
		{
			var moduleData = this._moduleList[ moduleName ],
				mainFile = '';
	
			// Проверяем есть ли у нас такой модуль
			if( moduleData === undefined )
			{
				throw new Error( 'TOM.boot: Модуль с названием "' + moduleName + '" не существует!' );
			}
	
			// Состояние загрузки модуля - начали загрузку
			this._moduleLoadedStates[ moduleName ] = 'started';
	
			// Выборка главного файла
			for( var i in loadList )
			{
				// Вставляем вместо * в имени файла - имя модуля
				loadList[i].file = loadList[i].file.replace( /(\*)/g, moduleName );
	
				// Считываем "главный файл"
				if( mainFile === '' && loadList[i].main === true )
				{
					mainFile = loadList[i].file;
				}
			}
	
			// Копируем список модулей
			moduleData.files = TOM._clone( loadList );
	
			// Проходим по списку файло и запоминаем зависимости
			for( var r in moduleData.files )
			{
				var fileData = moduleData.files[r], 
					requireList = this._prepareRequireList( moduleData, fileData.require );
	
				// Добавляем главный файл в начало списка зависимостей
				if( mainFile !== '' && fileData.file !== mainFile )
				{
					requireList[ 'files' ].unshift( moduleData.path + mainFile );
				}
	
				// Сохраняем зависимости
				moduleData.requires = moduleData.requires.concat( TOM._clone( requireList[ 'modules' ] ) );
				moduleData.files[r].requires = TOM._clone( requireList[ 'files' ] );
			}
	
			// Проходим по списку файлов для загрузки
			for( var i in moduleData.files )
			{
				var fileData = moduleData.files[i],
					loadFile = moduleData.path + fileData.file
					requireList = { files: moduleData.files[i].requires, modules: moduleData.requires };
	
				// Записываем тип файла
				fileData.type = fileData.type || ( /\.(css)$/.test( fileData.file ) ? 'css' : 'js' );
	
				// Проверяем расширение
				if( !/\.(js|css)$/.test( fileData.file ) )
				{
					throw new Error( 'TOM.boot: В очередь загрузки подано имя файла без расширения - ' + fileData.file );
				}
	
				// Смотрим чтоб в названии файла небыло кирилических символов
				if( ( /^([а-яА-Я])/gi ).test( fileData.file ) )
				{
					throw new Error( 'TOM.boot: В очередь загрузки подано имя файла с кирилическими символами - ' + fileData.file );
				}
	
				// Состояние загрузки - "не установлено"
				this._fileLoadedStates[ loadFile ] = 'none';
	
				// Создаём для каждого файла свой модуль загрузки ( это необходимо для возможной зависимости от определённого файла )
				( function( context, moduleName, fileData, loadedFile, requireList ) 
				{
					// Запускаем таймер проверки
					fileData.checkRequireTimer = setTimeout( function checkRequireTimerFunc( ) 
					{
						// Проверяем все ли файлы из зависимостей загружены, если нет - ждём дальше
						if( !context._requireCheck( requireList, { file: loadedFile, module: moduleName } ) )
						{ 
							fileData.checkRequireTimer = setTimeout( checkRequireTimerFunc, 50 );
						}
						else
						{
							clearTimeout( fileData.checkRequireTimer );
						}
					}, 50 );
				} )
				( this, moduleName, fileData, loadFile, requireList );
			}
	
			//
			return this;
		},
	
		/* Предобработка списка зависимостей
		 * 
		 * @moduleData {объект}
		 * @requires {массив}
		 * @returns {объект}
		 */
		_prepareRequireList: function( moduleData, requires )
		{	
			// Проверяем входящие данные
			if( requires === undefined )
			{
				return { files: [], modules: [] };
			}
	
			// Формируем переменные
			var requires = requires instanceof Array ? requires : [ requires ],
				requireList = { files: [], modules: [] };
	
			// Формируем список зависимостей/
			for( var i in requires )
			{
				var requireModuleName = requires[i];
	
				if( /\.css$/.test( requireModuleName ) )
				{
					continue;
				}
	
				// В списке зависимостей модуля - возможно не верное имя
				if( !/\.(js|css)(?:_|)$/.test( requireModuleName ) && /\.(.*?)$/.test( requireModuleName ) )
				{
					console.warn( 'TOM.boot: Возможно в список зависимостей модуля: "' + moduleData.name + '" подано имя файла без расширения - "' + requireModuleName + '"');
				}
				else if( /\.js$/.test( requireModuleName ) )
				{
					// Вставляем вместо * - имя модуля
					requireModuleName = requireModuleName.replace( /(\*)/g, moduleData.name );
	
					// Записываем в список путь
					requireList[ 'files' ].push( moduleData.path + requireModuleName );
				}
				else
				{
					// Записываем в список модуль
					requireList[ 'modules' ].push( requireModuleName );
				}
			}
	
			return requireList; 
		},
	
		/* Формируем список модулей
		 * 
		 * @moduleList {массив}
		 * @moduleType {строка}
		 * @returns {массив}
		 */
		_prepareModuleList: function( names, targetDir )
		{
			var item = undefined,
				loadList = [];
	
			// Формируем список файлов для инициализации
			for( var i in names )
			{
				var item = names[i],
					name = ( typeof item === 'string' ) ? item : ( item.name || '' ),
					baseURL = this._options.baseURL || '',
					targetDir = targetDir || '';
	
				// Смотрим чтоб в названии файла небыло кирилических символов
				if( typeof name === 'string' && ( /^([а-яА-Я])/gi ).test( name ) )
				{
					throw new Error( 'TOM.boot: В очередь загрузки подано имя файла с кирилическими символами - ' + name );
				}
	
				// Директория в которой находится загружаемый файл			
				var path = baseURL + ( targetDir !== '' ? ( ( !( /\/$/gi ).test( baseURL ) ? '/' : '' ) + targetDir.replace( /(\*)/gi, name ) + '/' ) : '' );
	
				// Путь к загружаемому файлу
				if( !/^http/gi.test( name ) )
				{
					var boot = path + name + ( !/\.js$/gi.test( name ) ? '.boot.js' : '' );
				}
				else
				{
					var boot = name;
				}
	
				// Добавляем файл в список
				loadList[ name ] = { name: name, path: path, boot: boot, files: [], requires: [], initCount: 0 };
			}
	
			//
			return loadList;
		},
	
		/* Загрузка скрипта или стиля
		 *
		 * @fileData {объект} -
		 * @callback {функция} -
		 */
		_loadScriptOrStyle: function( fileData, callback )
		{
			var context = this;
	
			// Изначальное состояние загрузки файла - "начали загружать"
			 if( fileData instanceof Object && fileData.file !== '' )
			{
				this._fileLoadedStates[ fileData.file ] = 'started';
			}
	
			// Функция обёртка колбека - для установки состояния файла
			var setStateCallback = function( state, data )
			{
				// Если мы закончили загрузку - проверяем нужна ли инициализация модулю
				if( state === 'complete' )
				{			
					var findData = context._findModuleFromFile( data.file );
	
					// Если нужна последующая инициализация - указываем это
					if( findData.script !== undefined 
						&& findData.script.initialize !== undefined 
						&& findData.script.initialize.length > 0 )
					{
						state = 'needINIT';
					}
				}
	
				// Изначальное состояние загрузки файла - "начали загрузку"
				context._fileLoadedStates[ data.file ] = state;
	
				// Вызываем оригинальный колбек
				if( typeof callback === 'function' )
				{
					callback( state, data );
				}
			};
	
			if( fileData.type === 'css' || /\.css$/.test( fileData.file ) )
			{		
				// Загружаем стиль
				this._loadCSS( fileData, setStateCallback );
			}
			else if( fileData.type === 'js' || /\.js$/.test( fileData.file ) )
			{		
				// Загружаем скрипт
				this._loadJS( fileData, setStateCallback );
			}
			else
			{
				throw new Error( 'TOM.boot: Не верный тип загружаемого файла - "' + fileData.type + '"!' );
			}
	
			//
			return this;
		},
	
		// Загрузка JS 
		// ( file, callback )
		_loadJS: function( fileData, callback )
		{	
			//
			var context = this,
				head = document.getElementsByTagName( 'head' ),
				url = fileData.file || '';
	
			// Формируем скрипт
			var script = document.createElement( 'script' );
				script.setAttribute( 'type', 'text/javascript' );
				script.setAttribute( 'src', url + ( !this._options.cache ? ( '?t=' + ( new Date( ) ).getTime( ) ) : '' ) );
				script.done = false;
	
			// Скрипт удачно загрузился
			script.onload = 
			script.onreadystatechange = function( )
			{
				if( !this.done
					&& ( this.readyState === undefined || this.readyState === 'complete' /*|| this.readyState === 'loaded'*/ ) )
				{
					this.done = true;
	
					this.onload = null;
					this.onreadystatechange = null;
					this.onerror = null;
	
					// Возвращаем результат через коллбек
					if( typeof callback === 'function' )
					{
						callback.call( context, 'complete', fileData );
					}
	
					// Удаляем скрипт из заголовка
					head.removeChild( this );
				}
			};
	
			// Ошибка загрузки скрипта
			script.onerror = function( )
			{
				if( !this.done )
				{
					this.done = true;
	
					this.onload = null;
					this.onreadystatechange = null;
					this.onerror = null;
	
					// Возвращаем результат через коллбек
					if( typeof callback === 'function' )
					{
						callback.call( context, 'error', fileData );
					}
				}
			};
	
			// Превышение допустимого времени загрузки скрипта
			this._interval( function( count )
			{
				if( script.done )
				{
					return false;
				}
	
				if( count < 1 )
				{
					script.done = true;
	
					// Возвращаем результат через коллбек
					if( typeof callback === 'function' )
					{
						callback.call( context, 'timeout', fileData );
					}
				}
			}, 100, 300 );
	
			// Если блок head у нас есть - добавляем в него скрипт
			if( head.length > 0 )
			{
				head = head[0];
				head.appendChild( script );
			}
	
			//
			return this;
		},
	
		// Загрузка CSS
		// ( file, callback )
		_loadCSS: function( fileData, callback )
		{
			//
			var context = this,
				head = document.getElementsByTagName( 'head' ),
				url = fileData.file || '';
	
			// Формируем объект
			var style = document.createElement( 'link' );
				style.setAttribute( 'rel', 'stylesheet' );
				style.setAttribute( 'type', 'text/css' );
				style.setAttribute( 'href', url + ( !this._options.cache ? ( '?t=' + ( new Date( ) ).getTime( ) ) : '' ) );
	
			// Загрузка стиля в Сафари
			if( navigator.userAgent.indexOf( 'Chrome' ) === -1 && navigator.userAgent.indexOf( 'Safari' ) > -1 )
			{
				this._interval( function( count )
				{
					if( style.sheet && style.sheet.cssRules && style.sheet.cssRules.length )
					{
						//
						if( typeof callback === 'function' )
						{
							callback.call( context, 'complete', fileData );
						}
	
						return false;
					}
	
					if( count < 1 )
					{
						style.done = true;
	
						//
						if( typeof callback === 'function' )
						{
							callback.call( context, 'error', fileData );
						}
					}
				}, 100, 300 );
			}
			// Загрузка в других браузерах
			else
			{
				// Состояние по умолчанию
				style.done = false;
	
				// Удачная загрузка стиля
				style.onload = function( )
				{
					if( !this.done )
					{
						this.done = true;
	
						//
						if( typeof callback === 'function' )
						{
							callback.call( context, 'complete', fileData );
						}
					}
				};
	
				// Ошибка загрузки стиля
				style.onerror = function( )
				{
					if( !this.done )
					{
						this.done = true;
	
						//
						if( typeof callback === 'function' )
						{
							callback.call( context, 'error', fileData );
						}
					}
				};
	
				// Превышение допустимого времени загрузки стиля
				this._interval( function( count )
				{
					if( style.done )
					{
						return false;
					}
	
					if( count < 1 )
					{
						style.done = true;
	
						//
						if( typeof callback === 'function' )
						{
							callback.call( context, 'timeout', fileData );
						}
					}
				}, 100, 300 );
			}
	
			if( head.length > 0 )
			{
				head = head[0];
				head.appendChild( style );
			}
	
			//
			return this;
		},
	
		// Слежение за таймаутом загрузки
		_interval: function( callback, time, count )
		{
			var context = this;
	
			if( typeof callback === 'function' )
			{
				if( callback.call( this, count ) !== false && count >= 1 )
				{
					setTimeout( function( )
					{
						count--;
						context._interval.call( context, callback, time, count );
					},
					time );
				}
			}
		},
	
		// Проверка загрузки зависимостей
		_requireCheck: function( requireList, load )
		{
			var requireLoadCounter = 0,
				requireFilesCount = ( requireList[ 'files' ] !== undefined ? requireList[ 'files' ].length : 0 ),
				requireModulesCount = ( requireList[ 'modules' ] !== undefined ? requireList[ 'modules' ].length : 0 );
	
			// Проверяем зависимости файла
			for( var j = 0; j <= 1; j++ )
			{
				var requireCount = ( j === 0 ? requireModulesCount : requireFilesCount );
	
				// Проверка зависимостей файла
				for( var i = 0; i < requireCount; i++ )
				{
					var requireModule = undefined,
						requireFile = undefined;
	
					// Проверяем загрузку модуля из зависимостей
					if( j === 0 && requireList[ 'modules' ][i] !== undefined )
					{
						requireModule = requireList[ 'modules' ][i];
						requireFile = this._moduleList[ requireModule ].boot;
					}
					// Проверяем загрузку файла из зависимостей
					else if( j === 1 && requireList[ 'files' ][i] !== undefined )
					{
						requireFile = requireList[ 'files' ][i];
	
						// Если у данного файла загружены ещё не все зависимости - ждём
						if( !this._checkFileRequire( requireFile ) )
						{
							continue;
						}
					}
					else
					{
						console.warn( 'TOM.boot: Прописана не верная зависимость!' );
						continue;
					}
	
					// Ставим файл/модуль на загрузку
					// и увеличиваем счётчик загруженных зависимостей - если файл/модуль уже загружен
					if( !this._checkAndLoad( requireFile, requireModule ) )			
					{
						requireLoadCounter++;
					}
				}
				
				// Проверяем загружены ли все модули, если нет - ждём дальше
				if( j === 0 && requireLoadCounter !== requireModulesCount )
				{
					break;
				}
			}
			
			// Загружаем нужный модуль/файл если уже пришло время
			if( requireLoadCounter === ( requireFilesCount + requireModulesCount ) )
			{
				var context = this;
	
				// Загружаем модуль/файл после загрузки всех зависимостей
				if( load !== undefined )
				{
					this._checkAndLoad( load.file, load.module );
				}
	
				return true;
			}
			else
			{
				return false;
			}
		},
	
		// Проверяем все ли зависимости данного файла загружены
		_checkFileRequire: function( fileData )
		{
			var requireFilesCount = 0;
	
			//
			if( fileData === undefined )
			{
				return true;
			}
	
			// Если в функцию передан непосредственно объект с данными файла
			if( fileData instanceof Object  )
			{
				var checkedFile = fileData.file,
					requireList = fileData.requires;
			}
			else if( typeof fileData === 'string' )
			{
				var findData = this._findModuleFromFile( fileData ),
					checkedFile = ( ( findData !== undefined && findData.script !== undefined ) ? findData.script.file : undefined ),
					requireList = ( findData.script !== undefined ? findData.script.requires : [] );
	
				// Если текущий файл это *.boot.js файл модуля - всё хорошо
				if( checkedFile === undefined && findData.module !== undefined )
				{
					return true;
				}
			}
			else
			{
				throw new Error( 'TOM.boot: В функцию подано не верное имя файла!' );
			}
	
			// Если не нашли нужный файл
			if( checkedFile === undefined )
			{
				debugger;
			}
	
			// Проверяем зависимости и возвращаем результат
			return this._requireCheck( { files: requireList } );
		},
		
		// Проверка необходимости загрузки
		_checkAndLoad: function( file, module )
		{
			// Если мы ждём полной загрузки модуля
			if( ( file === undefined || ( file !== undefined && this._fileLoadedStates[ file ] !== 'none' ) )
				&& ( module !== undefined && this._moduleLoadedStates[ module ] !== 'complete' ) )
			{
				this._afterLoadCheck( module );
				
				return true;
			}
			// Если мы ждём полной загрузки файла
			else if( ( file !== undefined && this._fileLoadedStates[ file ] === 'started' ) 
					&& ( module === undefined || ( module !== undefined && this._moduleLoadedStates[ module ] !== 'complete' ) ) )
			{
				return true;
			}
			// Если файл не поставлен на загрузку - ставим
			else if( ( file !== undefined && this._fileLoadedStates[ file ] === 'none' )
					&& ( module === undefined || ( module !== undefined && this._moduleLoadedStates[ module ] !== 'complete' ) ) )
			{
				//
				var context = this;
	
				// Загружаем файл
				this._loadScriptOrStyle( { file: file }, function( state, fileData )
				{
					// Проверка модулей/файлов после загрузки скрипта
					if( state === 'complete' || state === 'needINIT' )
					{
						context._afterLoadCheck( module );
					}
				} );
	
				return true;
			}
			else
			{			
				return false;
			}
		},
	
		// Проверяем все ли загрузились
		_afterLoadCheck: function( moduleOrFile )
		{		
			// Проверяем уровень загрузки конкретного модуля
			if( moduleOrFile !== undefined && moduleOrFile !== '' )
			{
				// Если мы не можем найти такой модуль - то ищем его среди файлов
				if( this._moduleList[ moduleOrFile ] === undefined )
				{
					var findData = this._findModuleFromFile( moduleOrFile ),
						moduleName = ( ( findData !== undefined && findData.module !== undefined ) ? findData.module.name : undefined );
				}
				else
				{
					var moduleName = moduleOrFile;
				}
	
				// Проверяем - нашли ли мы модуль
				if( moduleName === undefined )
				{
					throw new Error( 'TOM.boot: Не смогли найти модуль с именем: ' + moduleName );
					return;
				}
	
				//
				var fileLoadCount = 0,
					requireModulesLoadCount = 0;
	
				// Проверяем все ли файлы данного модуля загрузились
				for( var i in this._moduleList[ moduleName ].files )
				{
					var fileData = this._moduleList[ moduleName ].files[i],
						fileLoadState = this._fileLoadedStates[ this._moduleList[ moduleName ].path + fileData.file ];
	
					if( fileLoadState === 'complete' || fileLoadState === 'needINIT' )
					{
						fileLoadCount++;
					}
				}
	
				// Проверяем все ли зависимые модули загрузились
				for( var i in this._moduleList[ moduleName ].requires )
				{
					var requireModule =  this._moduleList[ moduleName ].requires[i];
	
					if( this._moduleLoadedStates[ requireModule ] === 'complete' )
					{
						requireModulesLoadCount++;
					}
				}
	
				// Проверяем уровень загрузки модуля
				if( this._moduleLoadedStates[ moduleName ] !== 'complete' 
					&& fileLoadCount === TOM._objectLength( this._moduleList[ moduleName ].files )
					&& requireModulesLoadCount === TOM._objectLength( this._moduleList[ moduleName ].requires ) )
				{
					// Выводим лог при необходимости
					if( this._debug.log )
					{
						console.info( 'TOM.boot: Модуль "' +  moduleName + '": загружен полностью' );
					}
					
					// Проверяем и инициализируем нужные объекты
					if( this._checkAndInitialize( moduleName ) )
					{
						// Отмечаем модуль как загруженный
						this._moduleLoadedStates[ moduleName ] = 'complete';
					}
				}
			}	
	
			// Вызов коллбеков в случае полной загрузки
			this._callbacksCall( );
		},
	
		//
		_checkAndInitialize: function( moduleName )
		{		
			var context = this,
				notInitCount = 1; // Счётчик "не загруженных" зависимостей ( по умолчанию - 1 )
			
			// Функция проверки зависимостей
			var checkInitializeRequire = function( requireList )
			{
				var initCount = 0;
						
				// Проходим по списку зависимостей
				for( var i in requireList )
				{
					// Если это модуль то игнорируем его ( засчитываем как за загружунную зависимость )
					if( context._moduleList[ requireList[i] ] !== undefined ) 
					{
						initCount++;
					}
					// Если скрипт загружен - засчитываем
					else if( context._fileLoadedStates[ requireList[i] ] === 'complete' || context._fileLoadedStates[ requireList[i] ] === 'init' ) 
					{
						initCount++;
					}
				}
				
				// Возвращаем результат
				return ( initCount === TOM._objectLength( requireList ) );
			};
	
			// Повторяем пока не будут загружены все зависимости
			while( notInitCount > 0 )
			{
				// Сбрасываем счётчик
				notInitCount = 0;
				
				// Инициализируем теперь то что необходимо
				for( var i in this._moduleList[ moduleName ].files )
				{
					var fileData = this._moduleList[ moduleName ].files[i],
						filePath = this._moduleList[ moduleName ].path + fileData.file,
						fileLoadState = this._fileLoadedStates[ filePath ];
	
					// Проверяем зависимости перед инициализацией
					if( !checkInitializeRequire( fileData.requires ) )
					{
						notInitCount++;
						continue;
					}
	
					// Формируем список инициализации
					if( fileData.initialize !== undefined && fileLoadState !== 'init' )
					{
						var initializeList = fileData.initialize instanceof Array ? fileData.initialize : [ fileData.initialize ];
	
						// Вызываем функцию initialize
						for( var j in initializeList )
						{
							var initFunctionName = initializeList[ j ].replace( /(\*)/g, moduleName );
	
							if( this._initializeCall( initFunctionName ) )
							{
								this._fileLoadedStates[ filePath ] = 'init';
							}
							else
							{
								// @todo: Следует сделать проверку на прерывание инициализации
								console.error( 'TOM.boot: Не смогли инициализировать: ' + initFunctionName );
							}
						}
					}
				}
			}
			
			return true;
		},
	
		// Инициализируем нужные объкты
		_initializeCall: function( initializeList )
		{
			var initializeList = new Array( initializeList ),
				initializeCount = 0;
	
			// Проходим по списку инициализации
			for( var i in initializeList )
			{
				if( initializeList[i] === undefined )
				{
					continue;
				}
	
				var pathList = initializeList[i].split( '.' ),
					obj = window, 
					initState = false,
					initResult = false;
	
				// Проходим по дереву объекта
				for( var j in pathList )
				{
					obj = obj[ pathList[j] ];
	
					// Проверям нашли ли мы нужный объект
					if( obj === undefined )
					{
						throw new Error( 'TOM.boot: Ошибка при поиске объекта инициализации - "' + initializeList[i] + '"!' );
					}
	
					/* @toRefact: здесь нужно посмотреть можно ли инициализоровать скрипты с классами ( obj === Function ) */
					if( ( typeof obj === 'object' || obj instanceof Function ) && obj.initialize instanceof Function )
					{
						initState = true;
						initResult = obj.initialize( ) || true; 
	
						delete obj.initialize;
						break;
					}
				}
	
				// Если инициализация не произошла - уведомляем об этом
				if( initState === false && this._debug.warning )
				{
					if( typeof obj === 'object' && obj.initialize === undefined )
					{
						console.warn( 'TOM.boot: Ошибка при инициализации - "' + initializeList[i] + '". Возможно инициализация происходила ранее!' );
					}
					else
					{
						console.warn( 'TOM.boot: Ошибка при инициализации - "' + initializeList[i] + '". Объект не существует!' );
					}
				}
	
				// Подсчитываем количество инициализированных объектов
				if( initState === true && initResult !== false )
				{
					initializeCount++;
				}
			}
	
			return ( initializeCount === initializeList.length );
		},
	
		// Запускаем колбеки
		_callbacksCall: function( )
		{
			// Вызов коллбеков в случае полной загрузки
			for( var i in this._callbackList )
			{
				var moduleInitCount = 0;
	
				//
				for( var m in this._callbackList[ i ].modules  )
				{
					if( this._moduleLoadedStates[ this._callbackList[ i ].modules[ m ] ] === 'complete' )
					{
						moduleInitCount++;
					}
				}
	
				// Запускаем коллбек если все модули загружены
				if( ( moduleInitCount === TOM._objectLength( this._callbackList[ i ].modules ) ) && ( this._callbackList[ i ].callback instanceof Function ) )
				{
					if( this._debug.log )
					{
						console.info( 'TOM.boot: ---! Загружены все модули данного этапа !---' );
					}
	
					// Вызываем коллбек
					this._callbackList[ i ].callback( );
	
					// Удаляем коллбек
					delete this._callbackList[ i ].callback;
				}
			}
		},
	
		// Поиск модуля по местоположению файла
		_findModuleFromFile: function( file )
		{
			// Если задали модуль а не файл ( с учётом возможности одинакового названия модуля и файла ) - прерываем работу
			if( this._moduleList[ file ] !== undefined && this._fileLoadedStates[ file ] !== undefined )
			{
				return { module: this._moduleList[ file ] };
			}
			else if( this._moduleList[ file ] !== undefined )
			{
				return false;
			}
	
			// Проходим по списку модулей
			for( var i in this._moduleList )
			{
				var moduleData = this._moduleList[i];
	
				// Если это boot.js файл
				if( moduleData.boot === file )
				{
					return { module: moduleData };
				}
	
				//
				for( var j in moduleData.files )
				{
					// Ищем нужный модуль и файл
					if( moduleData.files[j] === file
						|| ( moduleData.path + moduleData.files[j].file === file ) )
					{
						return { module: moduleData, script: moduleData.files[j] };
					}		
				}
			}
		},
	
		// Мониторинг "не загруженных" файлов и модулей
		_checkNotLoad: function( )
		{
			var notLoadedFiles = [],
				notInitFiles = [],
				notLoadedModules = [];	
	
			// Проверяем все ли файлы данного модуля загрузились
			for( var file in this._fileLoadedStates )
			{
				var fileLoadState = this._fileLoadedStates[ file ];
	
				if( fileLoadState === 'needINIT' )
				{
					notInitFiles.push( file );
				}
				else if( fileLoadState !== 'complete' && fileLoadState !== 'init' )
				{
					notLoadedFiles.push( file + ' (' + fileLoadState + ')' );
				}
			}
	
			// Проверяем все ли зависимые модули загрузились
			for( var i in this._moduleList )
			{
				var moduleLoadState =  this._moduleLoadedStates[ this._moduleList[ i ].name ];
	
				if( moduleLoadState !== 'complete' )
				{
					notLoadedModules.push( this._moduleList[ i ].name + ' (' + moduleLoadState + ')' );
				}
			}
	
			// Выводим лог о "не загруженных"
			if( notLoadedFiles.length > 0 )
			{
				console.info( 'TOM.boot: Не загрузились ' + notLoadedFiles.length + ' файлов: ' + notLoadedFiles.join( ', ' )  );
			}
	
			// Выводим лог о "не инициализированных"
			if( notInitFiles.length > 0 )
			{
				console.info( 'TOM.boot: Загрузились но не инициализировались ' + notInitFiles.length + ' файлов: ' + notInitFiles.join( ', ' )  );
			}
	
			// Выводим лог о "не загруженных"
			if( notLoadedModules.length > 0 )
			{
				console.info( 'TOM.boot: Не загрузились ' + notLoadedModules.length + ' модулей: ' + notLoadedModules.join( ', ' )  );
			}	
	
			return ( notLoadedFiles.length > 0 || notLoadedModules.length > 0 || notInitFiles.length > 0 );
		}
	};

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

	// Полифил для старых браузеров
	if( typeof Object.create !== 'function' )
	{
		Object.create = ( function( )
		{
			var Func = function( ){ };
	
			return function( prototype )
			{
				if( arguments.length > 1 )
				{
					throw Error( 'Второй аргумент не поддерживается!' );
				}
				if( typeof prototype !== 'object' )
				{
					throw TypeError( 'В функцию должен быть передан объект!' );
				}
	
				Func.prototype = prototype;
				var result = new Func( );
				Func.prototype = null;
	
				return result;
			};
		} )( );
	}
	
	// Создание и наследование "классов"
	TOM.classes =
	{
		/*
		 * @todo: 
		 * 1. Добавить приватные функции/переменные ( которые нельзя вызвать из наследника ). Возможно просто при вызове не обрабатывать функции с _ в начале названия функции
		 */
	
		/* Класс можно создавать тремя способами.
		 * 
		 * 1 способ ( рекомендуемый ):
		 * TOM.classes.create(
		 *		- область видимости -,
		 *		- имя создаваемого класса -,
		 *		- класс от которого нужно наследоваться -, 
		 *		
		 *		function constructor( ) // функция конструктор
		 *		{
		 *		},
		 *		
		 *		// -- Дальше идут функции в виде аргументов -- //
		 *		
		 *		function foo( )
		 *		{
		 *		},
		 *		
		 *		function bar( )
		 *		{
		 *		}
		 *	)
		 * 
		 * 2 способ:
		 * TOM.classes.create(
		 *		- область видимости -,
		 *		- имя создаваемого класса -,
		 *		- класс от которого нужно наследоваться -, 
		 *		
		 *		// Функция конструктор
		 *		function constructor( ) 
		 *		{
		 *		},
		 *		
		 *		// Функции в массиве или объекте
		 *		[
		 *			function foo( )
		 *			{
		 *			},
		 *		
		 *			function bar( )
		 *			{
		 *			}
		 *		]
		 *	)
		 * 
		 * 3 способ:
		 * TOM.classes.create(
		 *		- область видимости -,
		 *		- имя создаваемого класса -,
		 *		- класс от которого нужно наследоваться -, 
		 *		
		 *		// Функции в массиве или объекте, среди которых и функция конструктор
		 *		[
		 *			function constructor( )
		 *			{
		 *			},
		 *		
		 *			function foo( )
		 *			{
		 *			},
		 *		
		 *			function bar( )
		 *			{
		 *			}
		 *		]
		 */
	
		// Параметры отладки
		_debug: TOM._options.debug.classes, 
	
		// Список созданных классов
		_list: [],
	
		/* Создание класса с нужными параметрами 
		 * 
		 * @classScope {строка/объект} - "Область видимости"/Объект в который "встраиваемся"
		 * @className {строка} - Имя класса
		 * @inheritedClass {объект} - Наследуемый класс
		 * 
		 * ? @classConstructor - Функция "конструктор" объекта, ( может находится в массиве/объекте @functionList ).
		 * ? @functionList - Список функций - может быть массив, объект, или перечень функций в виде аргументов
		*/
		create: function( classScope, className, inheritedClass/*, [@]*/ )
		{
			var newClass = undefined,
				classConstructor = undefined,
				classScopeName = classScope.__scopeName__ || '',
				realClassScope = undefined,
				functionList = undefined;
	
			// Узнаём область видимости в которую будем записывать класс
			if( classScope instanceof Object )
			{
				realClassScope = classScope;
				classScope = classScopeName;
			}
			// Если это строка записываем в область видимости window[ classScope ]
			else if( typeof classScope === 'string' && classScope !== '' && window[ classScope ] !== undefined )
			{
				realClassScope = window[ classScope ];
			}
			else
			{
				throw new Error( 'TOM.class: Ошибка при создании класса: не указана "область видимости"!' );
				return;	
			}
	
			// Проверяем класс от которого собираемся наследоваться
			if( inheritedClass === undefined )
			{
				throw new Error( 'TOM.class: Класс от которого мы собрались наследоваться - не существует!' );
				return;
			}
	
			// Если 4м аргументом ( счёт идёт от 0, первые 3 аргумента указаны в заголовке ) пришла функция - берём её за конструктор, 
			// а остальные за функции в виде аргументов
			if( arguments[ 3 ] instanceof Function )
			{
				classConstructor = arguments[ 3 ];
	
				// Если 5м аргументом является функция - считываем список всех последующих функций из аргументов
				if( arguments[ 4 ] instanceof Function )
				{			
					functionList = [].slice.call( arguments, 4 );
				}
				// Если массив/объект - берём его как список функций
				else if( arguments[ 4 ] instanceof Array || arguments[ 4 ] instanceof Object )
				{
					functionList = arguments[ 4 ];
				}
				// Или выводим ошибку
				else if( arguments[ 4 ] !== undefined )
				{
					throw new Error( 'TOM.class: Ошибка при создании класса: не верные входные данные!' );
					return;
				}
			}
			// Если 4м аргументом - пришёл массив, берём в нём 1й елемент в качестве конструктора
			// а все остальные - в качестве функций
			else if( arguments[ 3 ] instanceof Array )
			{
				classConstructor = arguments[ 3 ][ 1 ];
				functionList = [].slice.call( arguments[ 3 ], 2 );
	
				// Если первым елементом является не функция - выдаём ошибку
				if( !( classConstructor instanceof Function ) )
				{
					throw new Error( 'TOM.class: Ошибка при создании класса: не верные входные данные!' );
					return;
				}
			}
			// Если 4м аргументом - пришёл массив или объект, ищем в нём "contructor"
			else if( arguments[ 3 ] instanceof Object && arguments[ 'constructor' ] instanceof Function )
			{
				// Ссылаемся на конструктор
				classConstructor = arguments[ 3 ][ 'constructor' ];
	
				// Удаляем из объекта конструктор
				var copyObject = TOM._clone( arguments[ 3 ] );
				delete copyObject[ 'constructor' ];
	
				// Присваиваем объект в качестве списка функций
				functionList = copyObject;
			}
			else
			{
				throw new Error( 'TOM.class: Ошибка при создании класса: не верные входные данные!' );
				return;
			}
	
			// Создаём сам класс
			newClass = function( )
			{
				var args = Array.prototype.slice.call( arguments, 1 ),
					constructorFullName = ( ( this.__classScopeName__ !== '') ? this.__classScopeName__ + '.' + this.__className__ : this.__className__ ) + '.constructor';
	
				// Дополнительные "костыли" для TOM.processor, которые возволяют определять момент создания класса 
				TOM.processor.signal( 'pre', constructorFullName, this, args );
				classConstructor.apply( this, arguments );
				TOM.processor.signal( 'post', constructorFullName, this, args );
			};
	
			// Дополнительно прописываем конструктор класса
			newClass.prototype.constructor = classConstructor;
	
			// Прописываем данные класса
			newClass.__isClass__ = newClass.prototype.__isClass__ = true; // Дополнительная переменная указывающая что это класс ( так, на всякий случай )
			newClass.__className__ = newClass.prototype.__className__ = className; // Имя класса ( для определения - из какого класса вызов и т.д. )
			newClass.__classScopeName__ = newClass.prototype.__classScopeName__ = classScopeName;
			newClass.__classFullName__ = ( newClass.__classScopeName__ !== '' ? newClass.__classScopeName__ + '.' : '' ) + newClass.__className__;
			newClass.__classScope__ = newClass.prototype.__classScope__ = classScope || {}; // Область видимости данного класса
	
			// Проверка имени класса
			newClass.__checkClassName__ = 
			newClass.prototype.__checkClassName__ = function( className, checkParent )
			{
				// Сверяем имя класса
				var checkedName = ( ( this.__classScopeName__ !== '') ? this.__classScopeName__ + '.' + this.__className__ : this.__className__ ),
					checkState = ( checkedName === className );
	
				// Проверяем имя класса по цепочке родителей
				if( !checkState && checkParent )
				{
					var parentClass = this.__parent__,
						parentCheckState = false,
						parentCheckedClassName = '';
	
					while( true )
					{
						if( parentClass !== undefined )
						{
							// Считываем полное имя класса родителя
							parentCheckedClassName = ( parentClass.__classScopeName__ !== '') ? parentClass.__classScopeName__ + '.' + parentClass.__className__ : parentClass.__className__;
	
							// Проверяем совпадение имени класса родителя
							if( parentCheckedClassName === className )
							{
								parentCheckState = true;
								break;
							}
	
							parentClass = parentClass.__parent__;
						}
						else
						{
							break;
						}
					}
				}
	
				// Возвращаем результат
				return checkState || parentCheckState;
			};
	
			// Реализуем "деструктор", обнуляя в нём всё что нам попадётся
			newClass.prototype.destructor = function( )
			{
				for( var name in this )
				{
					delete this[ name ];
				}
			};
	
			// Делаем ссылки на деструктор - под другими именами
			newClass.prototype.destroy = function( )
			{
				return this.destructor.apply( this, ( arguments.length > 0 ? arguments : arguments.callee.caller.arguments ) );
			};
	
			// Прописываем функции из functionList в prototype
			if( functionList instanceof Array || functionList instanceof Object )
			{
				// Проходим по списку функция и прописываем их в создаваемый класс
				for( var indexOrName in functionList )
				{
					var functionName = ( !( functionList[ indexOrName ] instanceof Function ) || ( functionList instanceof Object && functionList[ indexOrName ].name === '' ) ) 
										? indexOrName 
										: functionList[ indexOrName ].name;
	
					// Если это не функция, или функция с именем - копируем
					if( functionName === undefined || functionName !== '' )
					{
						newClass.prototype[ functionName ] = functionList[ indexOrName ]; 
					}
					else if( this._debug.warning )
					{
						console.warn( 'TOM.class: При создании класса не удалось скопировать параметр/функцию - не правильное имя!' );
					}
				}
			}
	
			// Наследуемся если это необходимо
			if( inheritedClass instanceof Object || inheritedClass instanceof Function )
			{
				this.inherit( newClass, inheritedClass );
			}
	
			// Переносим класс в необходимую область видимости - если такая есть
			if( realClassScope !== undefined )
			{
				// Прописываем класс в нужную область видимости
				realClassScope[ className ] = newClass;
			}
	
			// Добавляем класс в список
			this._list[ newClass.__classFullName__ ] = newClass;
	
			// Проксируем созданный и уже унаследованный класс
			TOM.processor.proxy( newClass, newClass.__classFullName__ );
	
			// Возвращаем созданный класс
			return newClass;
		},
	
		/* Расширение класса путём добавления методов родителя
		 * 
		 * @childClass {объект/функция} - Класс которому необходимо произвести наследование
		 * @parentClass {объект/функция} - Класс от которого нужно произвести наследование
		 * @return {Boolean}
		 */
		inherit: function( childClass, parentClass )
		{
			// Если первым елементом является не функция - выдаём ошибку
			if( parentClass === undefined || parentClass === '' )
			{
				throw new Error( 'Ошибка при наследовании класса: родитель не указан или не создан!' );
				return;
			}
	
			// Имя родителя / имя функции конструктора ( необходимо нам в будующем )
			var parentName = parentClass.__className__ || parentClass.name || '';
			if( parentName === '' )
			{
				throw new Error( 'Ошибка при наследовании класса: у класса нет имени!' );
				return;
			}
	
			// Запоминаем методы наследника
			var childPrototype = childClass.prototype;
	
			// Начинаем наследование
			childClass.prototype = Object.create( parentClass.prototype );
			childClass.prototype.constructor = childClass;
	
			// Переопределяем родительские методы
			for( var childMethodName in childPrototype )
			{
				childClass.prototype[ childMethodName ] = childPrototype[ childMethodName ];
			}
	
			// Оставляем конструктор родителя
			childClass.prototype.__parent__ = parentClass.prototype;
	
			// Возврат ссылки на родительскую функцию
			childClass.prototype.__parentParameter__ = function( parameterName )
			{
				//
				if( parameterName !== '' && this.__parent__.hasOwnProperty( parameterName ) )
				{
					return this.__parent__[ parameterName ];
				}
				//
				else if( parameterName === '' )
				{
					console.warn( this.__className__ + ': Не указано имя параметра/функции!' );
				}
				//
				else
				{
					console.warn( this.__className__ + ': Параметр/функция "' + parameterName + '" не существует!' );
				}
			};
	
			// Вызов функции родителя ( с параметрами ), не указывая префикс
			childClass.prototype.__parentFunction__ = function( functionName, callArguments )
			{
				var callFunction = this.__parentParameter__( functionName ),
					callArguments = ( callArguments instanceof Array ) ? callArguments : [ callArguments ];
	
				if( !( callFunction instanceof Function ) )
				{
					console.warn( this.__className__ + ': Функции "' + functionName + '" не существует' );
					return;
				}
	
				return callFunction.apply( this, callArguments );
			};
	
			// Вызываем родительскую функцию по имени вызывающей функции
			childClass.prototype.__parentCall__ = function( )
			{
				var callerObject = arguments.callee.caller,
					callerFunction = arguments.callee.caller.name || '',
					callerArguments = ( arguments.length > 0 ? arguments : arguments.callee.caller.arguments ); // @todo: проверить правильно ли ставятся аргументы
	
				if( callerFunction !== '' && this.__parent__[ callerFunction ] instanceof Function )
				{
					var caller = ( callerObject.prototype.__className__ === this.__parent__.__className__ ) ? this.__parent__ : this;
					// console.log( 'Вызываем функцию ' + callerFunction + ' от имени ' + caller.__className__ );
	
					return caller.__parent__[ callerFunction ].apply( this, callerArguments );
				}
				else if( callerFunction === '' )
				{
					console.warn( this.__className__ + ': У вызывающей функции нет имени!' );
				}
				else
				{
					console.warn( this.__className__ + ': Функции "' + callerFunction + '" не существует!' );
				} 
			};
	
			// Возвращаем ссылку
			return this;
		}
	};

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
} )( window );