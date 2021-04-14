# Discord Ticket System
> Обработка заявок через бота Discord и систему вопросов. 

## Установка
Бот написан на системе Node.JS с использованием библиотек:
    Discord.JS - библиотека для бота
    FS(FileSystem) - файловая система для считывания и записи файлов

Установка библиотек: node i discord.js fs
Запуск бота: node index.js


## Использование:
```
/ticket - используется в личных сообщениях с ботом. Создает тикет, и задает вопросы, автор тикета на них отвечает. Когда вопросы закончились, автор проверяет правильность ввода и отправляет.
    далее бот создает канал в специально настроеной категории(настройки) с названием "ticket_<ID тикета>". Доступ к каналу имеет автор и все пользователи с админ-правами.
/bug - по идее использоваться не будет, но вписан для использования при застревании тикета. Освобождает заявку.
/close - закрывает тикет, использовать в канале тикета. В зависимости от настройки(settings.js) закроет доступ к нему автору, либо удалит канал.
```


## Credits
@ua-rexdeep | Discord: [UA] ReXDeep#5857