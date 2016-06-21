'use strict';

/* * * * * * * * * * * * * *
 *  Подключениемые модули 
 * * * * * * * * * * * * * */

var gulp = require( 'gulp' ),
	gulpif = require('gulp-if'),
	concat = require( 'gulp-concat' ),
	uglify = require('gulp-uglify'),
	header = require('gulp-header'),
	include = require( 'gulp-include' ),
	watch = require( 'gulp-watch' ),
	sync = require( 'gulp-config-sync' ),
	rimraf = require( 'rimraf' );

/* * * * * * * * * * * * * *
 * Переменные / Функции 
 * * * * * * * * * * * * * */

// Пути
var paths = 
{
	src: { 
		main: './src/',
		demo: './demo/'
	},
	
	build: {
		main: './build/'
	}
};

// Параметры сборок
var bundles =
{
	dev: {
		fileSuffix: '',
		name: 'dev',
		compress: false,
		debug: true
	},
	
	production: {
		fileSuffix: '.min',
		name: 'production',
		compress: true,
		debug: false
	}
};

// Бандл по умолчанию
var bundle = bundles[ 'dev' ];

/* * * * * * * * * * * * * *
 * Задачи 
 * * * * * * * * * * * * * */

// Очищаем директорию сборки
gulp.task( 'clean', function( )
{  
    // return rimraf.sync( paths.build.main + '**' );
} );

// Синхронизация изменений конфигураций для bower и сomposer
gulp.task( 'config:sync', function( )
{
	var options = 
	{
		fields: [
			'version',
			'description',
			'keywords',
			'repository',
			'license',
			{
				from: 'contributors',
				to: 'authors'
			}
		],
		space: '  '
	};
	
	//
	gulp.src( [ 'bower.json', 'composer.json' ] )
		.pipe( sync( options ) ) // Синхронизируем данные
		.pipe( gulp.dest( '.' ) );
} );

// Сборка фреймворка TOM
gulp.task( 'TOM:build', function( ) 
{ 
	// Формируем имя файла
	var fileName = 'TOM' + bundle.fileSuffix + '.js';
	
	// Формируем заголовок для файла
	var pkg = require( './package.json' ),
		banner = [ '/**',
					' * <%= pkg.name %> - <%= pkg.description %>',
					' * @version v<%= pkg.version %>',
					' * @link <%= pkg.homepage %>',
					' * @license <%= pkg.license %>',
					' * @author <%= pkg.author %>',
					' */',
					'',
					'' ].join( '\n' );
	
	// Выполняем поставленные задачи
	return gulp.src( paths.src.main + 'main.js' )
			.pipe( include( { hardFail: true } ) ) // Импортируем файлы
			.pipe( concat( fileName ) ) // Объеденяем файлы
			.pipe( header( banner, { pkg : pkg } ) ) // Установка хидера
			.pipe( gulpif( bundle.compress, uglify( { mangle: false, compress: false } ) ) ) // Сжимаем скрипт
			.pipe( gulp.dest( paths.build.main ) );
} );

// Обработка прочих файлов
gulp.task( 'other:transfer', function( )
{
    return gulp.src( [ paths.src.main + '**/*.*' ], { base: paths.src.main } )
        .pipe( gulp.dest( paths.build.main ) );
} );

// Задача по сборке на локальной машине
gulp.task( 'build', [ 'config:sync', 'TOM:build' ] );

// Задача по сборке на рабочем сервере
gulp.task( 'build:production', function( ) 
{
	bundle = bundles[ 'production' ];
	
	gulp.start( 'TOM:build' );
} );

// Задача по умолчанию
gulp.task( 'default', function( ) 
{ 
	// Запускаем основные задания
	gulp.start( 'clean', 'build' );

	/* * * * * * * * * * * * * *
	 * Смотрители 
	 * * * * * * * * * * * * * */

	// Смотритель фреймворка
	gulp.watch( paths.src.main + '*.*', function( ) 
	{
		rimraf.sync( paths.build.main + '**' );
		gulp.start( 'TOM:build' );
	} );

	// Слежение за любыми другими файлами
	gulp.watch( paths.src.main + '**/*.*', [ 'other:transfer' ] );
} );