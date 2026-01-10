require('dotenv').config();
const ping = require('ping');
const wol = require('wake_on_lan');
const axios = require('axios');

const CONFIG = {
    ip: process.env.TARGET_IP,
    mac: process.env.TARGET_MAC,
    threshold: parseInt(process.env.DOWNTIME_THRESHOLD_MIN),
    interval: parseInt(process.env.CHECK_INTERVAL_SEC) * 1000,
    skipStart: parseInt(process.env.SKIP_START_HOUR),
    skipEnd: parseInt(process.env.SKIP_END_HOUR),
    tgToken: process.env.TELEGRAM_BOT_TOKEN,
    tgChatId: process.env.TELEGRAM_CHAT_ID
};

let downTimeCounter = 0;
let isFirstDownNotify = true; // ใช้สำหรับคุมการแจ้งเตือนไม่ให้ส่งรัวเกินไป

// ฟังก์ชันส่งข้อความเข้า Telegram
async function sendTelegram(message) {
    const url = `https://api.telegram.org/bot${CONFIG.tgToken}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: CONFIG.tgChatId,
            text: `⚠️ [Monitor Alert]\n${message}`,
            parse_mode: 'HTML'
        });
    } catch (err) {
        console.error('Telegram Notify Error:', err.message);
    }
}

function isExcludedTime() {
    const currentHour = new Date().getHours();
    return currentHour >= CONFIG.skipStart && currentHour < CONFIG.skipEnd;
}

async function monitorDevice() {
    const now = new Date().toLocaleString('th-TH');

    if (isExcludedTime()) {
        if (downTimeCounter > 0) downTimeCounter = 0;
        return;
    }

    try {
        const res = await ping.promise.probe(CONFIG.ip);

        if (res.alive) {
            // ถ้าก่อนหน้านี้ดับอยู่ แล้วตอนนี้กลับมาติด ให้แจ้งว่า Online แล้ว
            if (downTimeCounter >= 1) {
                await sendTelegram(`✅ <b>${CONFIG.ip}</b> is now BACK ONLINE!\nTime: ${now}`);
            }
            downTimeCounter = 0;
            isFirstDownNotify = true;
            console.log(`[${now}] ${CONFIG.ip} is ONLINE.`);
        } else {
            downTimeCounter++;
            console.warn(`[${now}] ${CONFIG.ip} is OFFLINE. (${downTimeCounter} min)`);

            // แจ้งเตือนครั้งแรกที่ตรวจพบว่าดับ (ไม่รอ 15 นาที เพื่อให้รู้ตัวก่อน)
            if (downTimeCounter === 1 && isFirstDownNotify) {
                await sendTelegram(`❗ <b>${CONFIG.ip}</b> is down.\nWaiting for ${CONFIG.threshold} mins before WOL.`);
                isFirstDownNotify = false;
            }

            // เมื่อดับเกินเวลาที่กำหนด -> ส่ง WOL
            if (downTimeCounter >= CONFIG.threshold) {
                console.error(`!!! Threshold reached. Sending WOL...`);
                
                wol.wake(CONFIG.mac, async (err) => {
                    if (err) {
                        await sendTelegram(`❌ Failed to send WOL to ${CONFIG.mac}\nError: ${err.message}`);
                    } else {
                        await sendTelegram(`🚀 Sent <b>Wake-on-LAN</b> to ${CONFIG.mac}\nDue to ${CONFIG.threshold} mins downtime.`);
                    }
                });
                
                // กันการส่ง WOL รัวๆ: ให้รออีก 15 นาทีค่อยส่งใหม่ถ้ายังไม่ติด
                downTimeCounter = 0; 
            }
        }
    } catch (err) {
        console.error('Monitor Error:', err);
    }
}

console.log(`🚀 Monitor Service Started for ${CONFIG.ip}`);
sendTelegram(`🖥 <b>Monitor Service Started</b>\nTarget: ${CONFIG.ip}\nThreshold: ${CONFIG.threshold}m`);

monitorDevice();
setInterval(monitorDevice, CONFIG.interval);
