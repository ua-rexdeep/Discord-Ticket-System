const Discord = require("discord.js");
const fs = require("fs");
const bot = new Discord.Client({ws: { intents: Discord.Intents.ALL }});
var client = null;

const config = require(`./settings.js`) // считываем настройки

if(!config||typeof(config)!="object"||config.token == null) { // нет настроек или не верны - перезаписываем файл
    fs.writeFile('settings.js',`// => Default settings
var config = {};

config.guildID = 'guildID?String';
config.ticketCategory = 'categoryID?String'; // Категория, куда будут складываться все каналы тикетов
config.token = ''; // токен приложения -> https://discord.com/developers/applications

config.deleteChannelAfterClosing = false; // удалять канал после закрытия? true - да, false - нет

config.quests = [
    ['Вопрос', 'Пример', 'RegEx(проверка на правильность ввода)'],
]

module.exports = config;
    `,()=>{console.log('Process committed suicide. Reason: settings.js not found. File was created with default settings.');process.exit();})
    return
}

var tickets = [];

const botFunctions = {
    ready: function(){ // Вызывается когда бот авторизировался в систему.
        console.log("DISCORD",`Bot was logged in.`);
    },
    /**
     * Вызывается когда кто-либо, куда-либо пишет сообщение, и бот имеет туда доступ.
     * @param {Message?Object} message - класс сообщения -> https://discord.js.org/#/docs/main/stable/class/Message
     * @returns void
     */
    message: function(message){
        // Тип канала - текстовый и применена команда /close
        if(message.channel.type=="text"&&message.content.startsWith('/close')) closeTicketCommand(message);
        if(message.channel.type=="dm"&&message.content.startsWith("/bug")) bugCommand(message);
        else if(message.content.startsWith('/ticket')) ticketCommand(message)
        else if(message.channel.type=="dm"&&message.author.id!=bot.user.id) {
            let ticket = tickets.find(ticket=>ticket.user==message.author.id&&ticket.status=='Collect'); // ищем открытый тикет автора
            if(ticket) { // нашли
                if(config.quests[ticket.questions.length][2]&&!message.content.match(config.quests[ticket.questions.length][2])) { // проверка на совпадение с маской(RegEX)(если указана)
                    return message.channel.send(`❌ | Ответ не отвечает требованиям. **Вопрос #${ticket.questions.length+1}**: ${config.quests[ticket.questions.length][0]} \`Пример: ${config.quests[ticket.questions.length][1]}\`.`);
                }
                let image = ''; 
                message.attachments.forEach(a=>{image = a.url;}) // ниже мы определим, была ли загружена в сообщение картинка, если да - вытащим ссылку на неё
                ticket.questions.push(image?image:message.content); // вставляем ответ в список
                if(ticket.questions.length>=config.quests.length) { // вопросы закончились, автор проверяет правильность
                    ticket.status = 'Compiled' // ставим статус, чтобы избежать багов
                    let url = ticket.questions.find(x=>x.match(/^([a-z\-_0-9\/\:\.]*\.(jpg|jpeg|png|gif))$/i)); // имеется ссылка - используем
                    console.log(url)
                    if(url) url = url.match(/^([a-z\-_0-9\/\:\.]*\.(jpg|jpeg|png|gif))$/i)
                    console.log(url)
                    message.channel.send(embed({
                        color:"#FF0000",
                        image: url?url[0]:false,
                        description: `Заявка составлена! Укажите правильность ответов соответствующей реакцией под сообщением.\n\n TicketID: ${ticket.id} \n\n**---> Основная проблема <---**\n ${ticket.questions[ticket.questions.length-1]}\n ${ticket.questions.slice(0,ticket.questions.length-(url?2:1)).map((q,idx)=>{
                            return `\n**#${idx+1}. ${config.quests[idx][0]}**: ${q}`
                        }).join("")}`,
                    })).then(async (m)=>{
                        ticket.userMessage = m.id; // запоминаем ID сообщения, далее пригодиться чтобы определить реакцию
                        await m.react("✅")
                        await m.react("❌")
                        saveTickets(); // сохраняемся
                    });
                    saveTickets(); // сохраняемся
                } else { // следующий вопрос
                    message.channel.send(embed({
                        color:"#FF0000",
                        description: `**Вопрос #${ticket.questions.length+1}**: ${config.quests[ticket.questions.length][0]} \`Пример: ${config.quests[ticket.questions.length][1]}\`.`,
                    }));
                    saveTickets(); // сохраняемся
                }
            }
        }
    },
    messageReactionAdd: function(react,user){
        let ticket = tickets.find(x=>x.userMessage==(react.message.id||react.message)&&x.status=='Compiled'&&x.user==user.id);
        let _user = bot.users.cache.get(user.id);
        if(ticket) {
            if(react.emoji.name=="✅") {
                ticket.status = 'Sended';
                _user.send(embed({
                    title: `✅ Мы создали Вам специальный канал на сервере.\nОжидайте ответа. 😊`
                }))
                let url = ticket.questions[5].match(/^([a-z\-_0-9\/\:\.]*\.(jpg|jpeg|png|gif))$/i);
                bot.guilds.cache.get(config.guildID).channels.create(`ticket_${ticket.id}`,{
                    permissionOverwrites: [
                        {
                            id: user.id,
                            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
                        },
                        {
                          id: config.guildID,
                          deny: 'VIEW_CHANNEL'
                        },
                    ],
                    parent: getChannel(config.ticketCategory),
                }).then(c=>{
                    c.send('<@'+user.id+'> Если вопрос исчерпан, или у Вас просто больше нет желания получать новые ответы, **закрой тикет** командой `/close`.').then(()=>c.send(embed({
                            image: url?url[0]:false,
                            description: `\n\n **TicketID**: ${ticket.id}\nUser: <@${ticket.user}>\n\n**---> Основная проблема <---**\n ${ticket.questions[ticket.questions.length-1]}\n ${ticket.questions.slice(0,ticket.questions.length-(url?2:1)).map((q,idx)=>{
                                return `\n**#${idx+1}. ${config.quests[idx][0]}**: ${q}`
                            }).join("")}`,
                        })).then(async (m)=>{
                            ticket.staffMessage = m.id;
                            saveTickets();
                        }));
                })
            }
            if(react.emoji.name=="❌") {
                ticket.status = 'Collect';
                ticket.questions = [];
                _user.send(embed({
                    title: `😟 Ну, давай ещё раз.`,description: `**Вопрос #1**: ${config.quests[0][0]}. \`Пример: ${config.quests[0][1]}\`.`,
                }))
                saveTickets();
            }
        }
    },
}

/**
 * Закрывает тикет. В настройках можно изменить, будет ли удаляться канал с тикетом, или нет -> config.deleteChannelAfterClosing.
 * @param {Message?Object} message  - класс сообщения -> https://discord.js.org/#/docs/main/stable/class/Message
 * @returns void
 */
const closeTicketCommand = function(message) {
    let ticket = tickets.find(ticket=>{
        console.log(message.channel.name, ticket.id)
        return message.channel.name=="ticket_"+ticket.id.toLocaleLowerCase()
    });
    if(!ticket) return; // команда была использована в пустую
    ticket.status = "Solved" // ставим статус, дабы избежать багов
    if(config.deleteChannelAfterClosing) message.channel.delete();
    else {
        message.delete(); // удаляем сообщение /close от того, кто закрывает тикет
        message.channel.send(embed({
            description: `<@${message.author.id}> закрыл тикет.`
        }));
        message.channel.overwritePermissions([{id: ticket.user, deny: ['VIEW_CHANNEL']},{id: config.guildID,deny: 'VIEW_CHANNEL'}]); // установка прав на просмотр канала. У автора забирается право на просмотр
        message.channel.setName(`closedTicket_${ticket.id}`); // установка имени, для идентификации закрыторого тикета
    }
    saveTickets(); // сохраняет тикеты, чтобы не потерять
}

/**
 * Отчитывается, если тикет застрял
 * @param {Message?Object} message  - класс сообщения -> https://discord.js.org/#/docs/main/stable/class/Message
 * @returns void
 */
const bugCommand = function(message) {
    let ticket = tickets.find(ticket=>ticket.user==message.author.id&&ticket.status=='Collect'); // ищем открытый тикет автора
    if(!ticket) return; // тикет не найден
    message.reply(embed({
        color: "#4caf50",
        description: `😟 | Мне жаль что так получилось. Я отчитаюсь по этому поводу.\nКоманда \`/ticket\` разблокирована.`
    }));
//     getChannel(ticketChannel).send(`<@282816403721945088>`), getChannel(ticketChannel).send(embed({
//         color: "#ff9800",
//         title: `Stuck report | ${ticket.id}`,
//         description: `User: <@${ticket.user}>\nStatus: **${ticket.status}**\nData: \`\`\`cs
// ${JSON.stringify(ticket.questions)}\`\`\``
//     })) // отправляем отчет по тикету
    ticket.status = "Stuck"; // закрываем тикет с пометкой что он застрял
    saveTickets(); // сохнаряем
}

/**
 * Команда создания тикета
 * @param {Message?Object} message  - класс сообщения -> https://discord.js.org/#/docs/main/stable/class/Message
 * @returns void
 */
const ticketCommand = function(message) {
    if(message.channel.type!="dm") message.reply(`❌ | Используйте эту команду только в личных сообщениях с **Ботом**: <@${bot.user.id}>`) // команда используеться только в личном чате с ботом
    else {
        if(tickets.find(ticket=>ticket.user==message.author.id&&ticket.status=='Collect')) return message.channel.send(embed({
            title:"❌ | Вы уже имеете открытый тикет. Обнаружили ошибку? \`/bug\`"
        })) // автор уже имеет открытый тикет
        let ticketID = "", c = "qwertyuiopasdfghjklzxcvbnm_QWERTYUIOPASDFGHJKLZXCVBNM0123456789";  // => Генерируем ID тикета
        for (let index = 0; index < 20; index++) ticketID+=c[parseInt(Math.random()*c.length)]; // => Генерируем ID тикета
        // ============================================================================================== //
        tickets.push({
            id: ticketID,
            user: message.author.id,
            time: new Date().getTime(),
            status: 'Collect',
            questions: [],
        }) // отправляем тикет в общий список
        message.reply(embed({
            color:"#FF0000",
            description: `Система задает вопросы, а Вы отвечаете на них. Таким образом мы составим заявку. Отвечаете обычным текстом, без использования комманд.\n**Вопрос #1**: ${config.quests[0][0]}. \`Пример: ${config.quests[0][1]}\`.`,
        }))
        saveTickets(); // сохраняем
    }
}

bot.login(config.token); // авторизируем бота

/**
 * Сохраняет тикеты, средством записи данных в файл ticketStorage.json
 */
const saveTickets = ()=>{
    fs.writeFile('ticketStorage.json',JSON.stringify(tickets), ()=>{console.log(new Date().toLocaleTimeString()+" > SAVE")})
}

/**
 * Считываем тикеты с файла ticketStorage.json и инициализируем
 */
fs.readFile('ticketStorage.json', 
    {encoding:'utf8', flag:'r'},
    function(err, data) {
        if(err) {
            console.log('ticketStorage.json > created')
            fs.writeFile('ticketStorage.json','[]',()=>{})
        }
        else {
            if(data.length<2) data = "[]"
            console.log('ticketStorage.json > parsed '+JSON.parse(data).length+' tickets')
            tickets = JSON.parse(data);
        }
    }
);
   
/**
 * Существует проблема дискорда: бот теряет классы(ссылки) на сообщения. Событие raw вызывается при абсолютно любом действии. Так я идентифицирую установку реакции на сообщение, даже если была потеряна связь
 */
bot.on('raw', packet => {
    if(packet.t=="MESSAGE_REACTION_ADD") {
        console.log(packet)
        botFunctions.messageReactionAdd({
            emoji: packet.d.emoji,
            message: packet.d.message_id,
            channel: packet.d.channel_id,
        }, bot.users.cache.get(packet.d.user_id))
    }
});

// упрощенная идентификация событий
for(let func in botFunctions) {
    bot.on(func, botFunctions[func]);
}

/**
 * 
 * @param {Object} data - список данных в формате объекта
 * @returns Discord:MessageEmbed
 */
const embed = function(data = {}){
    let em = new Discord.MessageEmbed()
	em.setColor(data.color||"#FF0000")
	if(data.title) em.setTitle(data.title)
	if(data.url) em.setURL(data.url)
	em.setAuthor("❤️ WAO Dayz | Ticket System ❤️","https://cdn.discordapp.com/icons/757263881163767848/51afceb8b9d21c1a304e91da39c2eb13.webp?size=128","https://discord.gg/7mSnMFKMcy") 
    //if(data.author) em.setAuthor(data.author.name, data.author.avatar, data.author.url)
	if(data.description) em.setDescription(data.description)
	if(data.thumbail) em.setThumbnail(data.thumbail)
	if(data.fields) em.addFields(data.fields)
	if(data.image) em.setImage(data.image)
	if(data.footer) em.setFooter(data.footer.text, data.footer.image);
	em.setTimestamp()
    return em;
}

/**
 * Находит канал по его ID
 * @param {string} channelID - ID канала
 * @returns Discord:Channel
 */
const getChannel = (channelID) => {
    return bot.guilds.cache.get(config.guildID).channels.cache.get(channelID);
}