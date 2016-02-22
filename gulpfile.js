'use strict';

/* * * * * * * * * * * * * *
 *  Подключениемые модули 
 * * * * * * * * * * * * * */

var gulp = require( 'gulp' ),
	gulpif = require('gulp-if'),
	gutil = require( 'gulp-util' ),
	sass = require( 'gulp-sass' ),
	cssmin = require( 'gulp-minify-css' ),
	postcss = require( 'gulp-postcss' ),
	autoprefixer = require( 'autoprefixer' ),
	concat = require( 'gulp-concat' ),
	uglify = require('gulp-uglify'),
	rigger = require( 'gulp-rigger' ),
	sourcemaps = require('gulp-sourcemaps'),
	watch = require( 'gulp-watch' ),
	debug = require( 'gulp-debug' ),
	rimraf = require( 'rimraf' );

/* * * * * * * * * * * * * *
 * Переменные / Функции 
 * * * * * * * * * * * * * */

// Пути
var paths = 
{
	src: { 
		main: 'src/',
		TOM: 'src/basic/TOM/main.js',
		libraries: 'src/libraries/**/',
		modules: 'src/modules/**/',
		addons: 'src/addons/**/',
		basic: 'src/basic/**/'
	},
	
	build: {
		main: 'build/',
		TOM: 'build/basic/'
	}
};

// Параметры сборок
var bundles =
{
	dev: {
		name: 'dev',
		compress: false,
		debug: true
	},
	
	production: {
		name: 'production',
		compress: true,
		debug: false
	}
};

//
var bundle = bundles[ 'dev' ];

// Обработка и сборка фреймворка TOM
var TOMBuild = function( ) 
{
	return gulp.src( paths.src.TOM, { base: paths.src.main }  )
			.pipe( rigger( ) )
			.pipe( concat( 'TOM.js' ) )
			//.pipe( gulpif( bundle.compress, sourcemaps.init( ) ) )
			.pipe( gulpif( bundle.compress, uglify( { mangle: false, compress: false } ) ) )
			//.pipe( gulpif( bundle.compress, sourcemaps.write( ) ) )
			.pipe( gulp.dest( paths.build.TOM ) );
};

// Обработка скриптов
var jsBuild = function( path )
{
    return gulp.src( paths.src[ path ] + '*.js', { base: paths.src.main } )
				// .pipe( debug( { title: 'js:' } ) ) // Вывод пофайлового лога
				//.pipe( gulpif( bundle.compress, sourcemaps.init( ) ) )
				.pipe( gulpif( bundle.compress, uglify( { mangle: false, compress: false } ) ) )
				//.pipe( gulpif( bundle.compress, sourcemaps.write( ) ) )
				.pipe( gulp.dest( paths.build.main ) );
};

// Сборка SAAS/SCSS
var scssBuild = function( path )
{
	return gulp.src( paths.src[ path ] + '*.scss', { base: paths.src.main } )
				// .pipe( plumber( ) ) // Не выбрасывать из компилятора если есть ошибки
				//.pipe( gulpif( bundle.compress, sourcemaps.init( ) ) ) // Инициализируем карту кода
				.pipe( sass( { errLogToConsole: true } ) ) // Компилируем SCSS файлы
				.pipe( postcss( [ autoprefixer( ) ] ) ) // Добавим префиксы
				.pipe( gulpif( bundle.compress, cssmin( ) ) ) // Сжимаем
				//.pipe( gulpif( bundle.compress, sourcemaps.write( ) ) ) // Записываем карту кода
				.pipe( gulp.dest( paths.build.main ) );
};

// Обработка css
var cssBuild = function( path, production )
{
    return gulp.src( paths.src[ path ] + '*.css', { base: paths.src.main } )
				//.pipe( gulpif( bundle.compress, sourcemaps.init( ) ) )
				.pipe( postcss( [ autoprefixer( ) ] ) ) // Добавляем префиксы
				.pipe( gulpif( bundle.compress, cssmin( ) ) ) // Сжимаем
				//.pipe( gulpif( bundle.compress, sourcemaps.write( ) ) )
				.pipe( gulp.dest( paths.build.main ) );
};

/* * * * * * * * * * * * * *
 * Задачи 
 * * * * * * * * * * * * * */

// Очищаем директорию сборки
gulp.task( 'clean', function( )
{  
    return rimraf.sync( paths.build.main + '/**' );
} );

// Обработка стилей
gulp.task( 'other:transfer', function( )
{
    return gulp.src( [ paths.src.main + '/**/*.*', 
					'!' +  paths.src.main + '/**/*.+(js|css|scss)' ], { base: paths.src.main } )
        .pipe( gulp.dest( paths.build.main ) );
} );

// Сборка фреймворка TOM
gulp.task( 'TOM:build', function( ) { return TOMBuild( ); } );

// Задача обработки скриптов библиотеки
gulp.task( 'js:build', function( ) { return jsBuild( '' ); } );

// Создаем SASS/SCSS задание	
gulp.task( 'scss:build', function( ) { return scssBuild( '' ); } );

// Обработка стилей
gulp.task( 'css:build', function( ) { return cssBuild( '' ); } );

// Задача по сборке на локальной машине
gulp.task( 'build', [ 'TOM:build', 'js:build', 'scss:build', 'css:build', 'other:transfer' ] );

// Задача по сборке на рабочем сервере
gulp.task( 'build:production', function( ) 
{
	bundle = bundles[ 'production' ];
	
	gulp.start( 'TOM:build' );
	gulp.start( 'js:build', 'scss:build', 'css:build', 'other:transfer' ); 
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
	gulp.watch( paths.src.main + '/basic/TOM/*.*', function( ) 
	{
		rimraf.sync( paths.build.main + '/basic/TOM/**' );
		gulp.start( 'TOM:build' );
	} );

	// Смотрители JS
	gulp.watch( paths.src.libraries + '/*.js', [ 'js:build' ] );

	// Смотрители SASS/SCSS
	gulp.watch( paths.src.addons + '/*.scss', [ 'scss:build' ] );

	// Смотрители CSS
	gulp.watch( paths.src.libraries + '/*.css', [ 'css:build' ] );

	// Слежение за любыми другими файлами
	gulp.watch( [ paths.src.main + '/**/*.*', 
				'!' +  paths.src.main + '/**/*.+(js|css|scss)' ], [ 'other:transfer' ] );
} );