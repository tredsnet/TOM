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

	// Список созданных классов
	_list: [],
	
	/* Логирование
	 */
	_log: function( type, msg )
	{
		TOM._log( 'classes', type, msg );
		return this;
	},
	
	/* Вывод исключения/ошибки
	 */
	_error: function( errorMsg, errorObj )
	{
		TOM._error( 'classes', errorMsg, errorObj );
		return this;
	},
	
	/* Вызов обработчика события
	 */
	_triggerCallback: function( event, args )
	{
		TOM._triggerCallback( 'classes', event, args );
		return this;
	},
	
	/* Обработка событий
	 */
	callback: function( event, callback )
	{
		TOM._callback( 'classes', event, callback );
		return this;
	},
		
	/* Удаление обработчика
	 */
	removeCallback: function( event )
	{
		TOM._removeCallback( 'classes', event );
		return this;
	},

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
		var	context = this,
			newClass = undefined,
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
			this._error( 'TOM.class: Ошибка при создании класса: не указана "область видимости"!' );
			return;	
		}

		// Проверяем класс от которого собираемся наследоваться
		if( inheritedClass === undefined )
		{
			this._error( 'TOM.class: Класс от которого мы собрались наследоваться - не существует!' );
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
				this._error( 'TOM.class: Ошибка при создании класса: не верные входные данные!' );
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
				this._error( 'TOM.class: Ошибка при создании класса: не верные входные данные!' );
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
			this._error( 'TOM.class: Ошибка при создании класса: не верные входные данные!' );
			return;
		}

		// Создаём сам класс
		var newClass = function( )
		{
			var args = Array.prototype.slice.call( arguments, 1 ),
				constructorFullName = ( ( this.__classScopeName__ !== '') ? this.__classScopeName__ + '.' + this.__className__ : this.__className__ ) + '.constructor';

			// Вызываем пред-обработчик конструктора
			context._triggerCallback( 'pre-constructor', [ constructorFullName, args ] );
			
			// Вызываем конструктор
			classConstructor.apply( this, arguments );
			
			// Вызываем пост-обработчик конструктора
			context._triggerCallback( 'post-constructor', [ constructorFullName, args ] );
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
			var checkedName = ( ( this.__classScopeName__ !== '' ) ? this.__classScopeName__ + '.' + this.__className__ : this.__className__ ),
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
						parentCheckedClassName = ( parentClass.__classScopeName__ !== '' ) ? parentClass.__classScopeName__ + '.' + parentClass.__className__ : parentClass.__className__;

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
				else
				{
					this._log( 'warn',  'TOM.class: При создании класса не удалось скопировать параметр/функцию - не правильное имя!' );
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
		
		// Вызываем обработчик создания класса
		context._triggerCallback( 'create', [ newClass ] );
		
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
			this._error( 'Ошибка при наследовании класса: родитель не указан или не создан!' );
			return;
		}

		// Имя родителя / имя функции конструктора ( необходимо нам в будующем )
		var parentName = parentClass.__className__ || parentClass.name || '';
		if( parentName === '' )
		{
			this._error( 'Ошибка при наследовании класса: у класса нет имени!' );
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
				this._log( 'warn',  this.__className__ + ': Не указано имя параметра/функции!' );
			}
			//
			else
			{
				this._log( 'warn',  this.__className__ + ': Параметр/функция "' + parameterName + '" не существует!' );
			}
		};

		// Вызов функции родителя ( с параметрами ), не указывая префикс
		childClass.prototype.__parentFunction__ = function( functionName, callArguments )
		{
			var callFunction = this.__parentParameter__( functionName ),
				callArguments = ( callArguments instanceof Array ) ? callArguments : [ callArguments ];

			if( !( callFunction instanceof Function ) )
			{
				this._log( 'warn',  this.__className__ + ': Функции "' + functionName + '" не существует' );
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
				this._log( 'warn',  this.__className__ + ': У вызывающей функции нет имени!' );
			}
			else
			{
				this._log( 'warn',  this.__className__ + ': Функции "' + callerFunction + '" не существует!' );
			} 
		};

		// Возвращаем ссылку
		return this;
	}
};