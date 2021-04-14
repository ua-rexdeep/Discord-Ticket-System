// => Default settings
var config = {};

config.guildID = 'guildID?String';
config.ticketCategory = 'categoryID?String'; // Категория, куда будут складываться все каналы тикетов
config.token = ''; // токен приложения -> https://discord.com/developers/applications

config.deleteChannelAfterClosing = false; // удалять канал после закрытия? true - да, false - нет

config.quests = [
    ['Вопрос', 'Пример', 'RegEx(проверка на правильность ввода)'],
]

module.exports = config;