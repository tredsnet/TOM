// Динамическая загрузка библиотек/модулей
TOM.boot =
{
	/*
	 * @ToDO:
	 * 1. (+) Сделать callback окончания полной загрузки всех модулей ( после того как убедились что всё загрузили - сами вызываем boot.Complete - и срабатывает колбек )
	 * 2. ( ) Инициализировать скрипты только после полной загрузки всех модулей.
	 * 3. ( ) Сделать параметр инициализации приложения - "по окончанию загрузки" ( инициализировать когда сработал - boot.complete )
	 * 4. ( ) Загружать вначале модули/файлы без зависимостей
	 * 5. ( ) Ускорить работу _requireCheck
	 * 6. ( ) Добавить проверку на существование модуля/файла из списка зависимостей
	 * 7. ( ) Инициализация должна проходить с учётом зависимостей
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

	// Общий список модулей со всеми данными
	_moduleList: [],

	// Список состояния загрузки модулей
	_moduleLoadedStates: [],

	// Список состояния загрузки файлов
	_fileLoadedStates: [],

	// Колбек должен вызваться только после полной загрузки всех модулей из данного списка
	_modulesCallbackList: [],
	
	// Мониторинговый таймер который будет уведомлять если какие-то модули ещё не загрузились
	_monitoringTimer: undefined,
	
	// Таймер полной загрузки
	_completeTimer: undefined,

	// Настройки
	_options: {
		baseURL: '', // Путь по которому находятся скрипты
		cache: true // Разрешено ли кеширование скриптов
	},

	/* Логирование
	 */
	_log: function( type, msg )
	{
		TOM._log( 'boot', type, msg );
		return this;
	},
	
	/* Вывод исключения/ошибки
	 */
	_error: function( errorMsg, errorObj )
	{
		TOM._error( 'boot', errorMsg, errorObj );
		return this;
	},
	
	/* Вызов обработчика события
	 */
	_triggerCallback: function( event, args )
	{
		TOM._triggerCallback( 'boot', event, args );
		return this;
	},
	
	/* Обработка событий
	 */
	callback: function( event, callback )
	{
		TOM._callback( 'boot', event, callback );
		return this;
	},
		
	/* Удаление обработчика
	 */
	removeCallback: function( event )
	{
		TOM._removeCallback( 'boot', event );
		return this;
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
			loadList = this._prepareModuleList( names, dir ),
			callback = ( callback instanceof Function ) ? callback : function( ) { };

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
		this._modulesCallbackList.push( { type: 'modules', modules: names, callback: callback } );

		// Запускаем мониторинговый таймер если он ещё не запущен
		if( this._monitoringTimer === undefined )
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
		
		// Очищаем таймер окончания загрузки
		if( this._completeTimer === undefined )
		{
			clearTimeout( this._completeTimer );
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
			this._error( 'TOM.boot: Модуль с названием "' + moduleName + '" не существует!' );
			return;
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

		// Проходим по списку файлов и запоминаем зависимости
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
				this._error( 'TOM.boot: В очередь загрузки подано имя файла без расширения - ' + fileData.file );
				return;
			}

			// Смотрим чтоб в названии файла небыло кирилических символов
			if( ( /^([а-яА-Я])/gi ).test( fileData.file ) )
			{
				this._error( 'TOM.boot: В очередь загрузки подано имя файла с кирилическими символами - ' + fileData.file );
				return;
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
				this._log( 'warn', 'TOM.boot: Возможно в список зависимостей модуля: "' + moduleData.name + '" подано имя файла без расширения - "' + requireModuleName + '"');
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
				this._error( 'TOM.boot: В очередь загрузки подано имя файла с кирилическими символами - ' + name );
				return;
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
			if( callback instanceof Function )
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
			this._error( 'TOM.boot: Не верный тип загружаемого файла - "' + fileData.type + '"!' );
			return;
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
				if( callback instanceof Function )
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
				if( callback instanceof Function )
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
				if( callback instanceof Function )
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
					if( callback instanceof Function )
					{
						callback.call( context, 'complete', fileData );
					}

					return false;
				}

				if( count < 1 )
				{
					style.done = true;

					//
					if( callback instanceof Function )
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
					if( callback instanceof Function )
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
					if( callback instanceof Function )
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
					if( callback instanceof Function )
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

		if( callback instanceof Function )
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
					this._log( 'warn', 'TOM.boot: Прописана не верная зависимость!' );
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
			this._error( 'TOM.boot: В функцию подано не верное имя файла!' );
			return;
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
				this._error( 'TOM.boot: Не смогли найти модуль с именем: ' + moduleName );
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
				this._log( 'info', 'TOM.boot: Модуль "' +  moduleName + '": загружен полностью' );
				
				// Проверяем и инициализируем нужные объекты
				if( this._checkAndInitialize( moduleName ) )
				{
					// Отмечаем модуль как загруженный
					this._moduleLoadedStates[ moduleName ] = 'complete';
				}
			}
		}	

		// Вызов коллбеков в случае полной загрузки
		this._moduleCallbackCall( );
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
					// Если прописана анонимная функция для инициализации
					if( fileData.initialize instanceof Function )
					{
						var initState = true,
							initResult = fileData.initialize( ) || true; 
						
						// Удаляем ссылку на функцию
						delete fileData.initialize( );
					}
					// Если прописан перечень функций для инициализации
					else
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
								this._log( 'error', 'TOM.boot: Не смогли инициализировать: ' + initFunctionName );
							}
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
					this._error( 'TOM.boot: Ошибка при поиске объекта инициализации - "' + initializeList[i] + '"!' );
					return;
				}

				/* @toRefact: здесь нужно посмотреть можно ли инициализоровать скрипты с классами ( obj === Function ) */
				if( ( obj instanceof Object || obj instanceof Function ) && obj.initialize instanceof Function )
				{
					initState = true;
					initResult = obj.initialize( ) || true; 

					delete obj.initialize;
					break;
				}
			}

			// Если инициализация не произошла - уведомляем об этом
			if( initState === false )
			{
				if( obj instanceof Object && obj.initialize === undefined )
				{
					this._log( 'warn', 'TOM.boot: Ошибка при инициализации - "' + initializeList[i] + '". Возможно инициализация происходила ранее!' );
				}
				else
				{
					this._log( 'warn',  'TOM.boot: Ошибка при инициализации - "' + initializeList[i] + '". Объект не существует!' );
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
	_moduleCallbackCall: function( )
	{
		// Вызов коллбеков в случае полной загрузки
		for( var i in this._modulesCallbackList )
		{
			// Если это не callaback модуля - пропускаем
			if( this._modulesCallbackList[ i ].type !== 'modules' )
			{
				continue;
			}
			
			//
			var moduleInitCount = 0;

			//
			for( var m in this._modulesCallbackList[ i ].modules  )
			{
				if( this._moduleLoadedStates[ this._modulesCallbackList[ i ].modules[ m ] ] === 'complete' )
				{
					moduleInitCount++;
				}
			}

			// Запускаем коллбек если все модули загружены
			if( ( moduleInitCount === TOM._objectLength( this._modulesCallbackList[ i ].modules ) ) && ( this._modulesCallbackList[ i ].callback instanceof Function ) )
			{
				//
				this._log( 'info', 'TOM.boot: ---! Загружены все модули данного этапа !---' );

				// Вызываем коллбек
				this._modulesCallbackList[ i ].callback( );

				// Удаляем коллбек
				delete this._modulesCallbackList[ i ];
			}
		}
		
		// Проверяем оставшиеся коллбеки
		if( TOM._objectLength( this._modulesCallbackList ) <= 0 )
		{
			var context = this;
			
			// Запускаем таймер на всякий случай
			this._completeTimer = setTimeout( function( ) { context._triggerCallback( 'complete' ); }, 500 );
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
			this._log( 'info', 'TOM.boot: Не загрузились ' + notLoadedFiles.length + ' файлов: ' + notLoadedFiles.join( ', ' )  );
		}

		// Выводим лог о "не инициализированных"
		if( notInitFiles.length > 0 )
		{
			this._log( 'info', 'TOM.boot: Загрузились но не инициализировались ' + notInitFiles.length + ' файлов: ' + notInitFiles.join( ', ' )  );
		}

		// Выводим лог о "не загруженных"
		if( notLoadedModules.length > 0 )
		{
			this._log( 'info', 'TOM.boot: Не загрузились ' + notLoadedModules.length + ' модулей: ' + notLoadedModules.join( ', ' )  );
		}	

		return ( notLoadedFiles.length > 0 || notLoadedModules.length > 0 || notInitFiles.length > 0 );
	}
};
