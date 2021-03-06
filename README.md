# T.O.M. [![Build Status](https://travis-ci.org/tredsnet/TOM.svg?branch=master)](https://travis-ci.org/tredsnet/TOM)
>*(расшифровывается как "treds.net" operating module, в честь проекта в котором она разработана)*

Библиотека *(мини-фреймворк если хотите)* - позволяющая быстро создавать модульные приложения.

- [Страница с примерами](http://tredsnet.github.io/TOM/)
- [Список изменений](https://github.com/tredsnet/TOM/blob/master/CHANGELOG.md)

**T.O.M.** состоит из трёх частей:
- **boot** - отвечает за асинхронную загрузку скриптов с учётом зависимостей
- **processor** - даёт возможность реакции на вызов функций внутри нашего приложения
- **classes** - при помощи него можно создавать классы с возможностью наследования и правильной структурой для *processor*