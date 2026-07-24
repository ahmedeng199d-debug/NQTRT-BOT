const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs } = require('firebase/firestore');

const BOT_TOKEN = '8906517834:AAE1BfNIbww2WcNKd6Ikv_J_62lNPoE8r5M';
const ADMIN_TELEGRAM_ID = 6086216034; // الآدي الخاص بك كإدمن
const WEB_APP_URL = 'https://ahmedeng199d-debug.github.io/NQTRT-BOT/'; // رابط استضافتك المحدث

const bot = new Telegraf(BOT_TOKEN);

const firebaseConfig = {
    apiKey: "AIzaSyBm_3bzAdskTHP_sbmCeoUxYt2nFXxANpE",
    authDomain: "nqtrt-trading.firebaseapp.com",
    projectId: "nqtrt-trading",
    storageBucket: "nqtrt-trading.firebasestorage.app",
    messagingSenderId: "111810460431",
    appId: "1:111810460431:web:48c844c874e5896af85c7a",
    measurementId: "G-6CJFTXJV1Q"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;

    const userRef = doc(db, "users", userId.toString());
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        await setDoc(userRef, {
            username: username,
            status: 'pending',
            joinedAt: new Date()
        });

        await bot.telegram.sendMessage(ADMIN_TELEGRAM_ID, 
            `🔔 **طلب انضمام جديد للمنصة!**\n\n👤 المستخدم: @${username}\n🆔 الآدي: \`${userId}\``,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ قبول', `approve_${userId}`), Markup.button.callback('❌ رفض', `reject_${userId}`)]
                ])
            }
        );

        return ctx.reply('👋 أهلاً بك في NQTRT TRADING.\n\n⏳ تم إرسال طلب انضمامك إلى الإدارة. سيتم إشعارك فور الموافقة على حسابك.');
    }

    const userData = userSnap.data();

    if (userData.status === 'pending') {
        return ctx.reply('⏳ حسابك قيد المراجعة من قِبل الإدارة. يرجى الانتظار لحين الموافقة.');
    }

    if (userData.status === 'rejected') {
        return ctx.reply('❌ عذراً، تم رفض طلب انضمامك للمنصة.');
    }

    return ctx.reply('🚀 أهلاً بك مجدداً في منصة NQTRT TRADING.',
        Markup.inlineKeyboard([
            [Markup.button.webApp('📊 فتح منصة التداول والأخبار', WEB_APP_URL)]
        ])
    );
});

// أمر إرسال رسالة أو إشعار لكل المشتركين المقبولين (Broadcast)
bot.command('send', async (ctx) => {
    if (ctx.from.id !== ADMIN_TELEGRAM_ID) {
        return ctx.reply('❌ هذا الأمر مخصص للإدمن فقط.');
    }

    const textMessage = ctx.message.text.replace('/send', '').trim();
    if (!textMessage) {
        return ctx.reply('⚠️ يرجى كتابة الرسالة بعد الأمر. مثال:\n`/send 📢 تنبيه هام بخصوص افتتاح السوق`', { parse_mode: 'Markdown' });
    }

    const usersSnap = await getDocs(collection(db, "users"));
    let count = 0;

    usersSnap.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.status === 'approved') {
            try {
                await bot.telegram.sendMessage(docSnap.id, `📢 **تنبيه من الإدارة:**\n\n${textMessage}`, { parse_mode: 'Markdown' });
                count++;
            } catch (e) {}
        }
    });

    ctx.reply(`✅ تمت إرسال الرسالة بنجاح إلى المشتركين المقبولين.`);
});

bot.action(/approve_(.+)/, async (ctx) => {
    const userId = ctx.match[1];
    const userRef = doc(db, "users", userId);
    
    await updateDoc(userRef, { status: 'approved' });
    await ctx.editMessageText(`✅ تمت الموافقة على المستخدم (\`${userId}\`) بنجاح.`, { parse_mode: 'Markdown' });
    
    try {
        await bot.telegram.sendMessage(userId, '🎉 تم قبول طلب انضمامك بنجاح!\n\nاضغط على الزر أدناه لفتح التطبيق:',
            Markup.inlineKeyboard([
                [Markup.button.webApp('📊 فتح منصة التداول والأخبار', WEB_APP_URL)]
            ])
        );
    } catch (e) {}
});

bot.action(/reject_(.+)/, async (ctx) => {
    const userId = ctx.match[1];
    const userRef = doc(db, "users", userId);
    
    await updateDoc(userRef, { status: 'rejected' });
    await ctx.editMessageText(`❌ تم رفض المستخدم (\`${userId}\`).`, { parse_mode: 'Markdown' });
    
    try {
        await bot.telegram.sendMessage(userId, '❌ عذراً، تم رفض طلب انضمامك للمنصة من قِبل الإدارة.');
    } catch (e) {}
});

bot.launch();
console.log('🤖 Bot is running and fully connected to NQTRT WebApp...');
