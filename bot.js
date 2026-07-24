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

// توكن البوت الخاص بك
const bot = new Telegraf('7971714545:AAHSg0M-m4y1v6g8R1Z1s3b0q1X6v8c7m9K');

// الـ IDs الخاصة بالأدمنز الثلاثة
const adminIds = [6086216034, 164465121, 5876814827]; 

// رسالة إخلاء المسؤولية الموحدة
const disclaimerText = `
⚜️ **NQTRT Terminal** ⚜️

• البوابة الرسمية لتلقي الصفقات والمتابعة الحصرية للأعضاء. تواصل معنا للحصول على الصلاحيات والدخول الكاملة للمنصة.

⚠️ **إخلاء مسؤولية وإدارة مخاطر:**
• الصفقات المطروحة حقيقية، لكن نجاحها يعتمد كلياً على التزامك التام بالخطوة، اختيار حجم اللوت المناسب لحسابك، والدخول في الوقت المناسب.
• لسنا مسؤولين عن أي خسائر ناتجة عن الدخول المتأخر أو المستعجل، عدم الالتزام بالأهداف، أو سوء إدارة رأس المال؛ فحماية حسابك وإدارته هي مسؤوليتك الشخصية وحدك.
`;

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name || "مستخدم";

  // 1. التحقق المباشر: إذا كان المستخدم أدمن، ندخله فوراً بدون انتظار!
  if (adminIds.includes(userId)) {
    return ctx.reply(`👑 أهلاً بك يا مشرف المنصة (${username})!\n\nحسابك مسجل كـ **أدمن أساسي**. يمكنك إدارة الطلبات واستلام الإشعارات مباشرة.`);
  }

  try {
    const userRef = doc(db, 'users', userId.toString());
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // مستخدم جديد تماماً
      await setDoc(userRef, {
        userId: userId,
        username: username,
        status: 'pending',
        joinedAt: new Date().toISOString()
      });

      // إرسال رسالة إخلاء المسؤولية وقيد الانتظار للمستخدم
      await ctx.reply(disclaimerText + "\n\n⌛ حسابك قيد المراجعة من قِبل الإدارة. يرجى الانتظار لحين الموافقة.", { parse_mode: 'Markdown' });

      // إرسال الإشعار لجميع الأدمنز في الخاص لديهم
      for (const adminId of adminIds) {
        try {
          await bot.telegram.sendMessage(
            adminId,
            `🔔 **طلب انضمام جديد للمنصة!**\n\n👤 المستخدم: @${username}\n🆔 الـ ID: \`${userId}\``,
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
          console.log(`Could not send notification to admin ${adminId}:`, err.message);
        }
      }

    } else {
      const userData = userSnap.data();
      if (userData.status === 'approved') {
        await ctx.reply("أهلاً بك مجدداً في منصة NQTRT Terminal. حسابك مفعل ومصرح له بالدخول!");
      } else {
        await ctx.reply(disclaimerText + "\n\n⌛ حسابك لا يزال قيد المراجعة من قِبل الإدارة.", { parse_mode: 'Markdown' });
      }
    }
  } catch (error) {
    console.error("Error handling start command:", error);
    await ctx.reply("حدث خطأ بسيط، يرجى المحاولة لاحقاً.");
  }
});

// التعامل مع أزرار الموافقة
bot.action(/approve_(.+)/, async (ctx) => {
  const targetUserId = ctx.match[1];
  const adminName = ctx.from.first_name;

  try {
    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, { status: 'approved' });

    await ctx.editMessageText(`✅ **تمت الموافقة على الطلب بنجاح** بواسطة ${adminName}.`, { parse_mode: 'Markdown' });

    await bot.telegram.sendMessage(
      targetUserId,
      "🎉 **تم قبول طلبك بنجاح!**\n\nأصبحت الآن قادراً على استخدام المنصة بالكامل.",
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error("Error approving user:", error);
    await ctx.answerCbQuery("حدث خطأ أثناء الموافقة على المستخدم.");
  }
});

// التعامل مع أزرار الرفض
bot.action(/reject_(.+)/, async (ctx) => {
  const targetUserId = ctx.match[1];
  const adminName = ctx.from.first_name;

  try {
    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, { status: 'rejected' });

    await ctx.editMessageText(`❌ **تم رفض الطلب** بواسطة ${adminName}.`, { parse_mode: 'Markdown' });
    
    await bot.telegram.sendMessage(
      targetUserId,
      "عازمين على إبلاغك بأنه تم رفض طلب انضمامك للمنصة في الوقت الحالي."
    );
  } catch (error) {
    console.error("Error rejecting user:", error);
    await ctx.answerCbQuery("حدث خطأ أثناء رفض المستخدم.");
  }
});

bot.launch();
console.log("🤖 Bot is running with Admin bypass & interactive approvals...");
