var config = {};

config.guildID = `529745473037402127`;
config.ticketCategory = `831902196701724704`; // Категория, куда будут складываться все каналы тикетов
config.token = `ODAyNjQ5MzI0MDk3MzcyMTcz.YAyTbw.bdku2IDGymadOnpzaI4SGyfuq2o`; // токен приложения -> https://discord.com/developers/applications

config.deleteChannelAfterClosing = false; // удалять канал после закрытия? true - да, false - нет

config.quests = [
    // [`Название сервера`, `WAO Dayz #1`],
    [`Время по МСК`, `12:10`, /^[0-9]{1,2}:[0-9]{1,2}$/],
    [`Ваш игровой никнейм`, 'ReXDeep'],
    [`Место расположение`, 'Старый собор'],
    [`Временной отрезок когда произошла проблема`, '10:00 - 11:00'],
    [`Ники тимейтов`, 'Dima., MAY, sunrise'],
    [`Скрин проблемы`, 'https://example.ru/image.jpg'],
    [`Основное описание проблемы`, `Колесо машины украли :c`]
]

module.exports = config;