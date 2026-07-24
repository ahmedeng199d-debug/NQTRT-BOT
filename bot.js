const { Telegraf } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

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
const bot = new Telegraf('8906517834:AAEiMlJMZ-ceHsiBrdxiw9-YS18H5XgpSc');

const disclaimerText = `
⚜️ **NQTRT Terminal** ⚜️

• البوابة الرسمية لتلقي الصفقات والمتابعة الحصرية للأعضاء.

⚠️ **إخلاء مسؤولية وإدارة مخاطر:**
• الصفقات المطروحة حقيقية، لكن نجاحها يعتمد كلياً على التزامك التام وإدارة رأس المال.
`;

bot.start(async (ctx) => {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name || "مستخدم";

    const userRef = doc(db, 'users', userId.toString());
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // حفظ المشترك الجديد في قاعدة البيانات بحالة قيد الانتظار
      await setDoc(userRef, {
        userId: userId,
        username: username,
        status: 'pending',
        joinedAt: new Date().toISOString()
      });

      await ctx.reply(disclaimerText + "\n\n⌛ تم تسجيل طلبك بنجاح، وهو الآن قيد المراجعة من قِبل الإدارة.", { parse_mode: 'Markdown' });
    } else {
      const userData = userSnap.data();
      if (userData.status === 'approved') {
        await ctx.reply("✅ أهلاً بك مجدداً! حسابك مفعل وجاهز لتلقي الصفقات والتنبيهات.");
      } else {
        await ctx.reply(disclaimerText + "\n\n⌛ طلبك لا يزال قيد المراجعة من قِبل الإدارة.", { parse_mode: 'Markdown' });
      }
    }
  } catch (error) {
    console.error("Start error:", error);
  }
});

bot.launch().then(() => {
  console.log("Bot is running smoothly!");
});
