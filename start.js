const rp        = require('request-promise');
const cheerio   = require('cheerio');
const mysql     = require('mysql2/promise');
const config    = require('./config');
const TelegramBot = require('node-telegram-bot-api');

const url = 'https://www.e-katalog.ru/list/189/pr-38912/';

const token = '';
const bot = new TelegramBot(token, {polling: true});

rp(url)
    .then(async function (html) {
        var connection = await mysql.createConnection(config);
        const $ = cheerio.load(html);
        const countCard = $('.model-price-range a').length;
        let result = [];
        let priceTo;
        let priceFrom;
        const maxPrice = '60 000';
        for (let i = 0; i < countCard; i++) {
            let link = $('.model-price-range a').eq(i).attr('link');
            let typePrice = $('.model-price-range a').eq(i).children('span').length;
            let price = '';

            if (typePrice === 2) {
                price = $('.model-price-range a').eq(i).children('span').eq(0).text();
            }
            if (typePrice === 3) {
                priceFrom = $('.model-price-range a').eq(i).children('span').eq(0).text();
                priceTo = $('.model-price-range a').eq(i).children('span').eq(1).text();
                price = priceFrom + '-' + priceTo;
            }
            if (price < maxPrice) {
                const [rows, fields] = await connection.execute('SELECT * FROM `cards` WHERE `link` = link AND `price` = price');
                if (!rows[0]) {
                    result.push({
                        'link': link,
                        'price': price
                    })
                }
            }
        }

        if (result) {
            for (const card of result) {
                const key = result.indexOf(card);
                const [rows, fields] = await connection.execute("INSERT INTO cards (`link`, `price`, `created_at`) VALUE ('"+card.link+"', '"+card.price+"', '"+new Date().toISOString().slice(0, 19).replace('T', ' ')+"')");
                var link = "https://www.e-katalog.ru" + card.link
                bot.sendMessage(588866042, "Появилась новая карта \nСсылка: "+ link + "\nЦена: " + card.price + "\nФильтр по цене : " + maxPrice);
            }

        }
    })
    .catch(function(err){
        console.log(err);
    });