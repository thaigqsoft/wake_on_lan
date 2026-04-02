# Network Device Monitor & Auto Wake-on-LAN (WOL)

สคริปต์ Node.js สำหรับมอนิเตอร์สถานะเครื่องคอมพิวเตอร์ในวงแลนผ่าน IP Address หากพบว่าเครื่องดับเกินเวลาที่กำหนด ระบบจะทำการส่งสัญญาณ Wake-on-LAN (Magic Packet) เพื่อเปิดเครื่องให้อัตโนมัติ พร้อมแจ้งเตือนผ่าน Telegram

## 📦 ข้อมูลโปรเจกต์ (Project Info)
- **ชื่อโปรเจกต์:** ping-monitor-wol
- **เวอร์ชั่น:** 1.0.0
- **ผู้พัฒนา:** Tanakorn Piamsin

## 🌟 คุณสมบัติ (Features)
- **Ping Monitoring:** ตรวจสอบสถานะ Online/Offline ทุกๆ 1 นาที (ปรับแต่งได้)
- **Time Window:** เว้นช่วงการตรวจสอบ (เช่น ช่วง 03:00 - 08:59 น.) เพื่อการซ่อมบำรุงหรือประหยัดไฟ โดยรองรับการตั้งเวลาตาม Timezone
- **Wake-on-LAN:** สั่งเปิดเครื่องอัตโนมัติเมื่อ Offline เกิน 15 นาที
- **Telegram Notification:** แจ้งเตือนสถานะผ่านบอท Telegram (แจ้งตอนดับ, แจ้งตอนส่ง WOL, และแจ้งตอนเครื่องกลับมาออนไลน์)
- **Timezone Support:** รองรับการตั้งค่า Timezone สำหรับการตรวจสอบและแสดงผลเวลา (Default: Asia/Bangkok)
- **Configurable:** ตั้งค่าผ่านไฟล์ `.env` โดยไม่ต้องแก้โค้ดหลัก

## 📋 ข้อกำหนด (Requirements)
- **Node.js:** v20 ขึ้นไป
- **npm:** 6.0.0 ขึ้นไป
- **การเชื่อมต่อเครือข่าย:** ต้องอยู่ในวงแลนเดียวกันกับเครื่องเป้าหมาย
- **Wake-on-LAN:** เครื่องเป้าหมายต้องเปิดใช้งาน WOL ใน BIOS/UEFI

## 🛠 การติดตั้ง (Installation)

### วิธีที่ 1: ติดตั้งแบบ Direct Node.js

1. **เตรียม Node.js:** ตรวจสอบว่าเครื่องมี Node.js ติดตั้งอยู่
   ```bash
   node --version
   ```

2. **โคลนหรือดาวน์โหลดโค้ด:** นำไฟล์ทั้งหมดไปไว้ในโฟลเดอร์ที่ต้องการ

3. **ติดตั้ง Library:**
   ```bash
   npm install
   ```

4. **ตั้งค่า Environment Variables:**
   ```bash
   cp .env.example .env
   nano .env  # หรือใช้ editor อื่นๆ
   ```

5. **รันสคริปต์:**
   ```bash
   node monitor.js
   ```

### วิธีที่ 2: ใช้งานผ่าน Docker

1. **Build Docker Image:**
   ```bash
   docker build -t ping-monitor-wol .
   ```

2. **รัน Container:**
   ```bash
   docker run -d \
     --name ping-monitor-wol \
     --restart=always \
     --network host \
     -e TARGET_IP="192.168.161.100" \
     -e TARGET_MAC="74:56:3c:d0:f8:82" \
     -e DOWNTIME_THRESHOLD_MIN="15" \
     -e CHECK_INTERVAL_SEC="60" \
     -e SKIP_START_HOUR="3" \
     -e SKIP_END_HOUR="9" \
     -e TIMEZONE="Asia/Bangkok" \
     -e TELEGRAM_BOT_TOKEN="your_bot_token" \
     -e TELEGRAM_CHAT_ID="your_chat_id" \
     ping-monitor-wol
   ```

3. **ตรวจสอบ Log:**
   ```bash
   docker logs -f ping-monitor-wol
   ```

## ⚙️ การตั้งค่า (Configuration)

แก้ไขไฟล์ `.env` ตามค่าที่ต้องการ:

```bash
# IP Address ของเครื่องเป้าหมายที่ต้องการมอนิเตอร์
TARGET_IP=192.168.161.100

# MAC Address ของเครื่องเป้าหมาย (ใช้สำหรับส่งสัญญาณเปิดเครื่อง)
TARGET_MAC=74:56:3c:d0:f8:82

# เกณฑ์เวลา (นาที): ถ้าเครื่องดับนานเกินกี่นาที ถึงจะสั่งเปิดเครื่อง
DOWNTIME_THRESHOLD_MIN=15

# ความถี่ในการตรวจสอบ (วินาที): จะให้ Ping เช็คทุกๆ กี่วินาที
CHECK_INTERVAL_SEC=60

# --- ช่วงเวลาที่ไม่ต้องตรวจสอบ (Maintenance Window) ---
# ชั่วโมงที่เริ่มหยุดเช็ค (เช่น 3 คือตี 3)
SKIP_START_HOUR=3
# ชั่วโมงที่กลับมาเริ่มเช็คอีกครั้ง (เช่น 9 คือ 9 โมงเช้า)
SKIP_END_HOUR=9

# Timezone สำหรับเช็คเวลา (ค่าเริ่มต้น: Asia/Bangkok)
# ตัวอย่างค่า: Asia/Bangkok, Asia/Hong_Kong, UTC, etc.
# ⚠️ สำคัญ: ช่วงเวลาข้างบนจะใช้ตาม Timezone ที่กำหนด
TIMEZONE=Asia/Bangkok

# --- Telegram Bot Settings ---
# Token ที่ได้จาก @BotFather
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Chat ID ของผู้รับการแจ้งเตือน ได้จาก @userinfobot หรือ @getidsbot
TELEGRAM_CHAT_ID=your_chat_id_here
```

### วิธีหา MAC Address
- **Windows:** เปิด Command Prompt แล้วพิมพ์ `ipconfig /all`
- **Linux/Mac:** พิมพ์ `ifconfig` หรือ `ip a`

### วิธีสร้าง Telegram Bot
1. เปิด Telegram และค้นหา `@BotFather`
2. พิมพ์ `/newbot` และทำตามคำสั่ง
3. เก็บ Bot Token ที่ได้
4. หา Chat ID ด้วย `@userinfobot` หรือ `@getidsbot`

### ⚠️ สิ่งสำคัญเกี่ยวกับ Timezone
- Timezone จะส่งผลต่อ **ทั้ง** การตรวจสอบช่วงเวลา (SKIP_START_HOUR/END) และ **เวลาที่แสดงในแจ้งเตือน**
- ถ้าเซิร์ฟเวอร์รันบนคลาวด์/ระยะไกลที่เป็น UTC ควรตั้งค่า `TIMEZONE=Asia/Bangkok` เพื่อให้เวลาตรงกับเวลาไทย
- ค่าเริ่มต้นคือ `Asia/Bangkok` แต่สามารถเปลี่ยนเป็น timezone อื่นๆ ได้ตามต้องการ

### ⚠️ ข้อจำกัดเกี่ยวกับช่วงเวลา (Maintenance Window)
- **ไม่รองรับการข้ามวัน** (Cross-Day Timezone Not Supported)
- ช่วงเวลาต้องอยู่ใน **วันเดียวกัน** เช่น `SKIP_START_HOUR=3`, `SKIP_END_HOUR=9` (03:00 - 08:59)
- **ห้าม** ตั้งค่าที่ข้ามวัน เช่น `SKIP_START_HOUR=23`, `SKIP_END_HOUR=9` (ไม่ทำงาน)
- ถ้าต้องการข้ามวัน ต้องแก้โค้ดฟังก์ชัน `isExcludedTime()` ให้รองรับการเปรียบเทียบเวลาข้ามวัน

## 🚀 การใช้งาน (Usage)

### การรันแบบปกติ
```bash
node monitor.js
```

### การใช้งานกับ PM2

#### ติดตั้ง PM2
```bash
npm install -g pm2
```

#### เริ่มต้นใช้งาน
```bash
pm2 start monitor.js --name wol-monitor
```

#### คำสั่งพื้นฐาน PM2
- **ดูสถานะ process:**
  ```bash
  pm2 status
  ```
- **ดู log:**
  ```bash
  pm2 logs wol-monitor
  ```
- **หยุด process:**
  ```bash
  pm2 stop wol-monitor
  ```
- **เริ่ม process ใหม่:**
  ```bash
  pm2 restart wol-monitor
  ```
- **ลบ process:**
  ```bash
  pm2 delete wol-monitor
  ```
- **ตั้งค่าให้ start อัตโนมัติเมื่อ reboot:**
  ```bash
  pm2 startup
  pm2 save
  ```

### การใช้งานกับ Docker

**รันแบบ Interpolation:**
```bash
docker run -d \
  --name ping-monitor-wol \
  --restart=always \
  --network host \
  -e TARGET_IP="$TARGET_IP" \
  -e TARGET_MAC="$TARGET_MAC" \
  -e DOWNTIME_THRESHOLD_MIN="$DOWNTIME_THRESHOLD_MIN" \
  -e CHECK_INTERVAL_SEC="$CHECK_INTERVAL_SEC" \
  -e SKIP_START_HOUR="$SKIP_START_HOUR" \
  -e SKIP_END_HOUR="$SKIP_END_HOUR" \
  -e TIMEZONE="$TIMEZONE" \
  -e TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
  -e TELEGRAM_CHAT_ID="$TELEGRAM_CHAT_ID" \
  ping-monitor-wol
```

**หยุดและลบ Container:**
```bash
docker stop ping-monitor-wol
docker rm ping-monitor-wol
```

## 🧪 การทดสอบ (Testing)

หลังจากติดตั้งและตั้งค่าเสร็จแล้ว สามารถทดสอบได้ดังนี้:

1. **ทดสอบ Ping:** ตรวจสอบว่าเครื่องสามารถ ping ถึงเครื่องเป้าหมายได้
   ```bash
   ping <TARGET_IP>
   ```

2. **ทดสอบ WOL:** ลองส่งสัญญาณ WOL โดยการปิดเครื่องเป้าหมายแล้วรัน script
   ```bash
   node monitor.js
   ```

3. **ตรวจสอบ Telegram:** ดูว่าได้รับการแจ้งเตือนหรือไม่

4. **ทดสอบช่วงเวลา Skip:** รัน script ในช่วงเวลาที่ตั้งไว้ (เช่น ตี 3 - 8 โมง) แล้วตรวจสอบว่าไม่มีการ ping และส่งแจ้งเตือน

## 🔧 การแก้ปัญหา (Troubleshooting)

### WOL ไม่ทำงาน
- ตรวจสอบว่าเปิด WOL ใน BIOS/UEFI แล้ว
- ตรวจสอบว่า MAC Address ถูกต้อง
- ตรวจสอบว่าเครื่องอยู่ในวงแลนเดียวกัน
- ลองใช้โปรแกรม WOL อื่นๆ เพื่อทดสอบ

### Telegram ไม่ส่งข้อความ
- ตรวจสอบ Bot Token และ Chat ID
- ลองส่งข้อความผ่าน Telegram API โดยตรง
- ตรวจสอบว่า Bot ถูก block หรือไม่

### Ping ไม่ได้
- ตรวจสอบว่าเครื่องเป้าหมายเปิดอยู่
- ตรวจสอบ Firewall ของเครื่องเป้าหม่าย
- ตรวจสอบว่า IP Address ถูกต้อง

### ช่วงเวลา Skip ไม่ทำงานตามที่ต้องการ
- ตรวจสอบว่าได้ตั้งค่า `TIMEZONE` แล้วหรือยัง
- ถ้าเซิร์ฟเวอร์อยู่บนคลาวด์/ระยะไกล ให้แน่ใจว่าตั้งค่า TIMEZONE ให้ตรงกับพื้นที่ของคุณ
- ตรวจสอบเวลาที่แสดงใน log ว่าตรงกับ timezone ที่ตั้งหรือไม่

## 📦 Dependencies

- **dotenv:** v17.2.3 - สำหรับจัดการ Environment Variables
- **ping:** v0.4.4 - สำหรับตรวจสอบสถานะเครือข่าย
- **wake_on_lan:** v1.0.0 - สำหรับส่งสัญญาณ Wake-on-LAN
- **axios:** v1.13.2 - สำหรับส่งข้อความผ่าน Telegram API

## 📄 License

MIT License
