const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');

// إعدادات Firebase الخاصة بك
const firebaseConfig = {
  apiKey: "ضع_مفتاح_الـ_api_هنا",
  authDomain: "nqtrt-trading.firebaseapp.com",
  projectId: "nqtrt-trading",
  storageBucket: "nqtrt-trading.appspot.com",
  messagingSenderId: "رقم_المراسلة",
  appId: "رقم_الـ_app"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// توكن البوت الصحيح الجديد
const bot = new Telegraf('8906517834:AAE1BfNIBww2WcNKd6Ikv_J_62lNPoE8r5M');

// الـ IDs الخاصة بالأدمنز الثلاثة
const adminIds = [6086216034, 164465121, 5876814827]; 

// رسالة إخلاء المسؤولية الموحدة
const disclaimerText = `
⚜️ **NQTRT Terminal** ⚜️

• البوابة الرسمية لتلقي الصفقات والمتابعة الحصرية للأعضاء.

⚠️ **إخلاء مسؤولية وإدارة مخاطر:**
• الصفقات المطروحة حقيقية، لكن نجاحها يعتمد كلياً على التزامك التام بالخطوة وإدارة رأس المال.
`;

bot.start(async (ctx) => {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name || "مستخدم";

    // إذا كان المستخدم أحد الأدمنز، نرحب به فوراً بدون أي شروط أو انتظار
    if (adminIds.includes(userId)) {
      return ctx.reply(`👑 أهلاً بك يا مشرف المنصة (${username})!\n\nحسابك مسجل كأدمن رئيسي وجاهز لإدارة الطلبات.`);
    }

    const userRef = doc(db, 'users', userId.toString());
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        userId: userId,
        username: username,
        status: 'pending',
        joinedAt: new Date().toISOString()
      });

      await ctx.reply(disclaimerText + "\n\n⌛ حسابك قيد المراجعة من قِبل الإدارة.", { parse_mode: 'Markdown' });

      // إرسال الإشعار لجميع الأدمنز مع أزرار الموافقة والرفض
      for (const adminId of adminIds) {
        try {
          await bot.telegram.sendMessage(
            adminId,
            `🔔 **طلب انضمام جديد!**\n\n👤 المستخدم: @${username}\n🆔 الـ ID: \`${userId}\``,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('موافقة ✅', `approve_${userId}`),
                  Markup.button.callback('رفض ❌', `reject_${userId}`)
                ]
              ])
            }
          );
        } catch (err) {
          console.log(`Admin msg error:`, err.message);
        }
      }
    } else {
      const userData = userSnap.data();
      if (userData.status === 'approved') {
        await ctx.reply("أهلاً بك مجدداً! حسابك مفعل ومصرح له بالدخول.");
      } else {
        await ctx.reply(disclaimerText + "\n\n⌛ حسابك لا يزال قيد المراجعة.", { parse_mode: 'Markdown' });
      }
    }
  } catch (error) {
    console.error("Start error:", error);
  }
});

bot.action(/approve_(.+)/, async (ctx) => {
  try {
    const targetUserId = ctx.match[1];
    const adminName = ctx.from.first_name;

    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, { status: 'approved' });

    await ctx.editMessageText(`✅ تمت الموافقة بواسطة ${adminName}.`, { parse_mode: 'Markdown' });
    await bot.telegram.sendMessage(targetUserId, "🎉 تم قبول طلبك بنجاح وأصبحت قادراً على استخدام المنصة.");
  } catch (error) {
    console.error("Approve error:", error);
  }
});

bot.action(/reject_(.+)/, async (ctx) => {
  try {
    const targetUserId = ctx.match[1];
    const adminName = ctx.from.first_name;

    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, { status: 'rejected' });

    await ctx.editMessageText(`❌ تم رفض الطلب بواسطة ${adminName}.`, { parse_mode: 'Markdown' });
    await bot.telegram.sendMessage(targetUserId, "عذراً، تم رفض طلب انضمامك في الوقت الحالي.");
  } catch (error) {
    console.error("Reject error:", error);
  }
});

bot.launch().then(() => {
  console.log("Bot is successfully running with correct token!");
});
