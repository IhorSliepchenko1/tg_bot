const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const botToken = '7793184238:AAFev9VQeom_69o_uazb3EFMa6pNZiK3Rtc';
const adminChatId = '533006515';
const apiKey = '6HVBG0X-A2749H1-GMH0MRS-GM9RQ7V';  // API ключ для NOWPayments
const bot = new TelegramBot(botToken, { polling: true });
const courseFilePath = path.resolve(__dirname, 'курс.rar');  // Путь к файлу курса
const usedPaymentsFilePath = path.resolve(__dirname, 'usedPayments.json');

const nowPaymentsUrl = 'https://api.nowpayments.io/v1/invoice'; // Убедитесь, что URL правильный
const payments = new Map();

async function createPaymentLink(amount, chatId) {
     try {
          const fixedAmount = parseFloat(amount.toFixed(2));
          const response = await axios.post(
               nowPaymentsUrl,
               {
                    price_amount: fixedAmount,
                    price_currency: 'trx',
                    pay_currency: 'trx',
                    order_id: `test_${Date.now()}`,
                    order_description: 'Оплата за курс криптовалют',
               },
               {
                    headers: {
                         'x-api-key': apiKey,
                         'Content-Type': 'application/json',
                    },
               }
          );

          const paymentUrl = response.data.invoice_url; // Ссылка для оплаты
          const paymentId = response.data.id;
          payments.set(paymentId, { chatId, checking: true });
          return paymentUrl;
     } catch (error) {
          console.error('Ошибка при создании платёжной ссылки:', error.response?.data || error.message);
          throw new Error('Не удалось создать платёжную ссылку. Попробуйте снова.');
     }
}

bot.on('callback_query', async (query) => {
     const chatId = query.message.chat.id;
     const action = query.data;

     if (action === 'buy') {
          payments.set(chatId, Date.now());

          try {
               const paymentUrl = await createPaymentLink(49, chatId);

               bot.sendMessage(chatId, `❗️ Для покупки курса необходимо внести 49 TRX. Перейдите по ссылке для оплаты:`);

               bot.sendMessage(chatId, `🔥 Для оплаты перейдите по ссылке: ${paymentUrl}`);

               bot.sendMessage(chatId, '💬 Если возникли трудности с оплатой, нажмите кнопку ниже для получения помощи.', {
                    reply_markup: {
                         inline_keyboard: [
                              [{ text: 'Помочь с оплатой?', url: 'https://t.me/iiiiiiiiiii1111iii' }]
                         ]
                    }
               });
          } catch (error) {
               bot.sendMessage(chatId, '⚠️ Произошла ошибка при создании ссылки для оплаты. Попробуйте позже.');
          }
     } else if (action === 'details') {
          bot.sendMessage(chatId, '💡 На нашем курсе ты:\n✅ Узнаешь основы криптовалют.\n✅ Освоишь безопасные инвестиции.\n✅ Получишь стратегии заработка!\n\n🚀 Не упусти шанс, нажми "Купить курс"!');

          bot.sendVideo(chatId, path.resolve(__dirname, 'motivation.mp4'))
               .then(() => {
                    bot.sendMessage(chatId, '🔥 Видео отправлено! Чтобы купить курс, нажми кнопку ниже!', {
                         reply_markup: {
                              inline_keyboard: [
                                   [{ text: 'Купить курс и стать мастером криптовалют! 💰', callback_data: 'buy' }]
                              ]
                         }
                    });
               })
               .catch((error) => {
                    console.error('Ошибка при отправке видео:', error);
                    bot.sendMessage(chatId, 'Произошла ошибка при отправке видео. Попробуй снова позже. ⚠️');
               });
     } else if (action === 'course_details') {
          bot.sendMessage(chatId, '🔍 Информация о курсе:\n- Курс включает в себя 10 модулей.\n- В каждом модуле теоретические и практические задания.\n- Стартуем с основ криптовалют и заканчиваем инвестиционными стратегиями.\n\nНачни обучение и раскрой потенциал криптовалют!');
     } else if (action === 'info') {
          bot.sendMessage(chatId, '🎁 Получи дополнительные материалы и новости по криптовалютам, а также эксклюзивные предложения.\nНе упусти шанс — следи за обновлениями!');
     }
});

const checkPaymentStatus = async (paymentId) => {
     const url = `https://api.nowpayments.io/v1/payment/${paymentId}`;

     try {
          const response = await axios.get(url, {
               headers: {
                    "x-api-key": apiKey,
               }
          });

          return response.data.payment_status

     } catch (error) {
          console.error('Error checking payment status:', error);
          if (error.response) {
               console.log('API Response:', error.response.data);
          }
     }
};

const readUsedPayments = () => {
     try {
          const data = fs.readFileSync(usedPaymentsFilePath, 'utf8');
          return JSON.parse(data);
     } catch (error) {
          return [];
     }
};

const writeUsedPayments = (paymentId) => {
     const usedPayments = readUsedPayments();
     usedPayments.push(paymentId);
     fs.writeFileSync(usedPaymentsFilePath, JSON.stringify(usedPayments), 'utf8');
};

bot.on('message', async (msg) => {
     const chatId = msg.chat.id;
     const text = msg.text.trim();

     try {
          if (!text) {
               bot.sendMessage(chatId, '⚠️ Пожалуйста, отправьте правильный payment_id для проверки.');
               return;
          }

          const usedPayments = readUsedPayments();
          if (usedPayments.includes(text)) {
               bot.sendMessage(chatId, '⚠️ Этот payment_id уже был использован. Курс уже был получен.');
               return;
          }

          const status = await checkPaymentStatus(text);

          if (status !== 'finished' && text !== `/start`) {
               bot.sendMessage(chatId, '⚠️ Платеж не найден. Пожалуйста, убедитесь, что вы отправили правильный payment_id.');
               return;
          }

          if (status === 'finished') {

               payments.delete(chatId);
               bot.sendMessage(chatId, '✅ Платеж подтвержден! Отправляю вам курс.');
               bot.sendDocument(chatId, courseFilePath)
                    .then(() => {
                         bot.sendMessage(chatId, '🔥 Спасибо за покупку! Удачи в изучении.');

                         writeUsedPayments(text);
                    })
                    .catch((err) => {
                         console.error('Ошибка отправки курса:', err);
                         bot.sendMessage(chatId, '⚠️ Возникла ошибка при отправке курса.');
                    });

               bot.sendMessage(adminChatId, `💰 Платеж подтвержден для пользователя ${chatId}. Курс отправлен.`);
          }
     } catch (error) {
          console.error('Ошибка при проверке статуса платежа:', error);
          bot.sendMessage(chatId, '⚠️ Произошла ошибка при проверке статуса платежа. Попробуйте позже.');
     }
});

const botStart = async () => {
     bot.onText(/\/start/, (msg) => {
          const chatId = msg.chat.id;

          const options = {
               reply_markup: {
                    inline_keyboard: [
                         [{ text: 'Купить курс ПО СУППЕР ЦЕНЕ 49 TRX! 💰', callback_data: 'buy' }],
                         [{ text: 'Подробнее о криптовалюте и нашем курсе 📚', callback_data: 'details' }],
                         [{ text: 'Информация о курсе 🔍', callback_data: 'course_details' }],
                         [{ text: 'Немного новостей 🎁', callback_data: 'info' }],
                    ],
               },
          };

          bot.sendMessage(chatId, '🚀 Привет! Ты на пороге великого путешествия! 💸 В мире криптовалют есть безбрежные возможности для финансовой свободы. Хочешь узнать, как зарабатывать? Тогда тебе сюда! 🌟\n\nВыбери действие:', options);
     });
};

botStart();