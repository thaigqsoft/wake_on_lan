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
    timezone: process.env.TIMEZONE || 'Asia/Bangkok',
    tgToken: process.env.TELEGRAM_BOT_TOKEN,
    tgChatId: process.env.TELEGRAM_CHAT_ID
};

let downTimeCounter = 0;
let isFirstDownNotify = true; // ใช้สำหรับคุมการแจ้งเตือนไม่ให้ส่งรัวเกินไป

// ตรวจสอบค่า config ที่จำเป็น
if (!CONFIG.ip || !CONFIG.mac) {
    console.error('❌ ERROR: Missing required configuration!');
    console.error('IP:', CONFIG.ip);
    console.error('MAC:', CONFIG.mac);
    console.error('Please check your .env file');
    process.exit(1);
}

if (isNaN(CONFIG.threshold) || CONFIG.threshold <= 0) {
    console.error('❌ ERROR: Invalid threshold value!');
    console.error('DOWNTIME_THRESHOLD_MIN:', process.env.DOWNTIME_THRESHOLD_MIN);
    console.error('Parsed threshold:', CONFIG.threshold);
    process.exit(1);
}

// แสดงค่า config เมื่อเริ่มทำงาน
console.log('═════════════════════════════════════════');
console.log('📋 CONFIGURATION:');
console.log('  Target IP:', CONFIG.ip);
console.log('  Target MAC:', CONFIG.mac);
console.log('  Threshold:', CONFIG.threshold, 'minutes');
console.log('  Check Interval:', CONFIG.interval / 1000, 'seconds');
console.log('  Timezone:', CONFIG.timezone);
console.log('═════════════════════════════════════════');

// แสดงตารางเวลาการทำงาน
console.log('\n📅 SCHEDULE TABLE (Timezone: ' + CONFIG.timezone + ')');
console.log('─'.repeat(60));
console.log('  Time Range     | Status   | Description');
console.log('─'.repeat(60));

for (let i = 0; i < 24; i++) {
    let status, desc, timeRange;

    if (i >= CONFIG.skipStart && i < CONFIG.skipEnd) {
        status = '⏸️ SKIP';
        desc = 'No monitoring, counter reset';
    } else {
        status = '✅ ACTIVE';
        desc = 'Monitoring enabled';
    }

    const hourStr = i.toString().padStart(2, '0') + ':00';
    const nextHour = ((i + 1) % 24).toString().padStart(2, '0') + ':00';
    timeRange = `${hourStr} - ${nextHour}`;

    const separator = i === CONFIG.skipEnd - 1 || (CONFIG.skipEnd === 0 && i === 23) ? '╪' : '│';

    console.log(`  ${timeRange} ${separator} ${status.padEnd(10)} ${desc}`);
}

console.log('─'.repeat(60));
console.log(`\n⚠️  Skip Window: ${CONFIG.skipStart.toString().padStart(2, '0')}:00 - ${CONFIG.skipEnd.toString().padStart(2, '0')}:00`);
console.log(`⚡  Monitoring:   00:00 - ${CONFIG.skipStart.toString().padStart(2, '0')}:00, ${CONFIG.skipEnd.toString().padStart(2, '0')}:00 - 23:59\n`);

console.log('═════════════════════════════════════════\n');

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
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: CONFIG.timezone,
        hour: 'numeric',
        hour12: false
    });
    const currentHour = parseInt(formatter.format(new Date()), 10);
    const isExcluded = currentHour >= CONFIG.skipStart && currentHour < CONFIG.skipEnd;

    if (isExcluded) {
        console.log(`⏸️  [SKIP] Current hour (${currentHour}:00) is within skip window (${CONFIG.skipStart}:00 - ${CONFIG.skipEnd}:00)`);
    }

    return isExcluded;
}

async function monitorDevice() {
    const formatter = new Intl.DateTimeFormat('th-TH', {
        timeZone: CONFIG.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const now = formatter.format(new Date());

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
                console.error(`\n⚡ Threshold reached (${downTimeCounter}/${CONFIG.threshold})`);
                console.error(`🔌 Sending Wake-on-LAN to MAC: ${CONFIG.mac}`);

                wol.wake(CONFIG.mac, async (err) => {
                    if (err) {
                        console.error(`❌ WOL Error:`, err.message);
                        await sendTelegram(`❌ Failed to send WOL to ${CONFIG.mac}\nError: ${err.message}`);
                    } else {
                        console.log(`✅ WOL packet sent successfully to ${CONFIG.mac}`);
                        await sendTelegram(`🚀 Sent <b>Wake-on-LAN</b> to ${CONFIG.mac}\nDue to ${CONFIG.threshold} mins downtime.`);
                    }
                });

                // กันการส่ง WOL รัวๆ: ให้รออีก 15 นาทีค่อยส่งใหม่ถ้ายังไม่ติด
                console.log(`🔄 Resetting counter to prevent duplicate WOL\n`);
                downTimeCounter = 0;
            } else {
                console.log(`⏳ Waiting for threshold (${downTimeCounter}/${CONFIG.threshold}) before WOL`);
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
