# QWEN AI Assistant - Project Memory

## ข้อมูลโปรเจกต์พื้นฐาน (Basic Project Info)

**ชื่อโปรเจกต์:** ping-monitor-wol (Wake on LAN)  
**เวอร์ชั่น:** 1.0.0  
**ผู้พัฒนา:** Tanakorn Piamsin  
**Repository:** ssh://192.168.76.249:2224/lab/scripts/wake_on_lan.git  
**Docker Registry:** registry-room.mt108.info/lab/scripts/wake_on_lan  
**CI/CD Platform:** GitLab (Runner บน Raspberry Pi Zero 2W และ Docker Build x86)

## วัตถุประสงค์ (Purpose)

สคริปต์ Node.js สำหรับมอนิเตอร์สถานะเครื่องคอมพิวเตอร์ในวงแลน หากพบว่าเครื่องดับเกินเวลาที่กำหนด จะส่งสัญญาณ Wake-on-LAN เพื่อเปิดเครื่องอัตโนมัติ พร้อมแจ้งเตือนผ่าน Telegram

## ส่วนประกอบหลัก (Main Components)

### 1. Core Files
- **monitor.js** - สคริปต์หลักที่ทำงานต่อเนื่อง
- **package.json** - กำหนด dependencies และ scripts
- **.env** - ไฟล์ config จริง (ไม่ commit)
- **.env.example** - ตัวอย่าง config สำหรับคนใหม่

### 2. Deployment Files
- **Dockerfile** - สำหรับ build Docker image (node:20-alpine)
- **.gitlab-ci.yml** - CI/CD pipeline สำหรับ GitLab

### 3. Documentation
- **README.md** - เอกสารประกอบภาษาไทย
- **QWEN.md** - ไฟล์นี้ (สำหรับ AI assistant)

## Dependencies หลัก

```
- dotenv: v17.2.3 (จัดการ Environment Variables)
- ping: v0.4.4 (ตรวจสอบสถานะเครือข่าย)
- wake_on_lan: v1.0.0 (ส่งสัญญาณ WOL)
- axios: v1.13.2 (ส่งข้อความ Telegram)
```

## การตั้งค่าหลัก (Main Configuration)

### Environment Variables (.env)

| Variable | ค่าเริ่มต้น | คำอธิบาย |
|----------|--------------|------------|
| TARGET_IP | 192.168.161.100 | IP ที่จะ monitor |
| TARGET_MAC | 74:56:3c:d0:f8:82 | MAC address สำหรับ WOL |
| DOWNTIME_THRESHOLD_MIN | 15 | รอกี่นาทีก่อนส่ง WOL |
| CHECK_INTERVAL_SEC | 60 | ตรวจสอบทุกกี่วินาที |
| SKIP_START_HOUR | 3 | เริ่มข้ามการเช็ค (ตี 3) |
| SKIP_END_HOUR | 9 | สิ้นสุดการข้าม (9 โมง) |
| TIMEZONE | Asia/Bangkok | Timezone สำหรับเวลา |
| TELEGRAM_BOT_TOKEN | - | Bot token จาก @BotFather |
| TELEGRAM_CHAT_ID | - | Chat ID ผู้รับแจ้งเตือน |

### ข้อจำกัดสำคัญ

⚠️ **ไม่รองรับการข้ามวัน (Cross-Day Not Supported)**
- ช่วงเวลาต้องอยู่ในวันเดียวกัน: `SKIP_START_HOUR < SKIP_END_HOUR`
- **ห้าม** ตั้งค่าแบบ: `SKIP_START_HOUR=23`, `SKIP_END_HOUR=9`
- ถ้าต้องการข้ามวัน ต้องแก้โค้ดฟังก์ชัน `isExcludedTime()`

## วิธีการทำงาน (How It Works)

### Flow หลัก:

1. **รอระยะเวลา:** รอตาม `CHECK_INTERVAL_SEC`
2. **ตรวจสอบเวลา:** เช็คว่าอยู่ในช่วง Skip (03:00-08:59) หรือไม่
   - ถ้าใช่ → รีเซ็ต counter แล้วข้ามไป loop ถัดไป
3. **Ping:** ตรวจสอบสถานะเครื่อง
4. **ถ้า Online:**
   - ถ้าก่อนหน้านี้ดับอยู่ → ส่ง Telegram แจ้งว่ากลับมาออนไลน์แล้ว
   - รีเซ็ต `downTimeCounter = 0` และ `isFirstDownNotify = true`
5. **ถ้า Offline:**
   - เพิ่ม `downTimeCounter++`
   - ถ้าเป็นครั้งแรก → ส่ง Telegram แจ้งว่าเครื่องดับ
   - ถ้าดับเกิน threshold (15 นาที) → ส่ง WOL + แจ้งเตือน Telegram + รีเซ็ต counter

### ฟังก์ชันสำคัญใน monitor.js:

```javascript
isExcludedTime()      // เช็คว่าอยู่ในช่วงเวลา skip หรือไม่ (ใช้ Intl.DateTimeFormat)
sendTelegram()       // ส่งข้อความไป Telegram
monitorDevice()      // ฟังก์ชันหลักที่ทำงานต่อเนื่อง
```

## การจัดการ Timezone (Timezone Handling)

### ⚠️ สำคัญมาก:
- เวลาทั้งหมดใช้ `Intl.DateTimeFormat` ตาม `CONFIG.timezone`
- เวลาแสดงใน log และ Telegram จะใช้ timezone เดียวกัน
- Default timezone: `Asia/Bangkok`

### โค้ดที่ใช้:
```javascript
const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.timezone,
    hour: 'numeric',
    hour12: false
});
const currentHour = parseInt(formatter.format(new Date()), 10);
```

## CI/CD Pipeline (GitLab)

### Stages:
1. **check-system** - แสดงข้อมูลระบบและ Docker containers
2. **build-docker** - Build image สำหรับ arm64 (Raspberry Pi)
3. **deploy-docker** - Deploy ไป Raspberry Pi Zero 2W

### Tags:
- `pizero2w` - Runner บน Raspberry Pi Zero 2W
- `docker-build-x86` - Runner สำหรับ build Docker image

### Deploy Command:
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
  registry-room.mt108.info/lab/scripts/wake_on_lan:latest
```

## Docker Configuration

### Base Image: `node:20-alpine`

### Installed Packages:
- `iputils` - สำหรับ ping
- `iproute2` - เครื่องมือเครือข่าย
- `tzdata` - สำหรับ timezone support

### Environment Variables ใน Docker:
- รับค่าจาก build args (`ARG`) และส่งต่อเป็น env (`ENV`)
- `TIMEZONE` default เป็น `Asia/Bangkok`
- ตั้งค่า system timezone ผ่าน:
  ```dockerfile
  RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
  ```

## วิธีการทดสอบ (Testing)

### 1. Test Ping:
```bash
ping <TARGET_IP>
```

### 2. Test WOL:
- ปิดเครื่องเป้าหมาย
- รัน script
- ตรวจสอบว่าเครื่องเปิดขึ้นมา

### 3. Test Timezone Skip:
- รัน script ในช่วงเวลา skip (03:00-08:59)
- ตรวจสอบว่าไม่มี ping และส่งแจ้งเตือน

### 4. Test Telegram:
- ตรวจสอบว่าได้รับการแจ้งเตือนเมื่อ:
  - เครื่องดับ
  - ส่ง WOL
  - เครื่องกลับมาออนไลน์

## ปัญหาที่พบบ่อย (Common Issues)

### WOL ไม่ทำงาน:
- ตรวจสอบ WOL ใน BIOS/UEFI
- ตรวจสอบ MAC Address
- ตรวจสอบว่าอยู่ในวงแลนเดียวกัน

### Telegram ไม่ส่ง:
- ตรวจสอ Bot Token และ Chat ID
- ลองส่งผ่าน API โดยตรง

### Ping ไม่ได้:
- ตรวจสอบ Firewall ของเครื่องเป้าหมาย
- ตรวจสอบ IP Address

### ช่วงเวลา Skip ไม่ทำงาน:
- ตรวจสอบ `TIMEZONE` ตั้งค่าถูกไหม
- ตรวจสอบเวลาใน log ว่าตรง timezone ที่ตั้งไหม

## วิธี Build & Deploy

### Local:
```bash
npm install
node monitor.js
```

### With PM2:
```bash
npm install -g pm2
pm2 start monitor.js --name wol-monitor
pm2 startup
pm2 save
```

### With Docker:
```bash
docker build -t ping-monitor-wol .
docker run -d --name ping-monitor-wol --restart=always --network host \
  -e TARGET_IP="..." -e TARGET_MAC="..." \
  -e TIMEZONE="Asia/Bangkok" \
  ping-monitor-wol
```

### GitLab CI/CD:
- Push ไป branch `main` หรือ `master`
- หรือสร้าง Tag
- Pipeline จะทำงานอัตโนมัติ

## Git Workflow

- Main branch: `main`
- Commit message ใช้ภาษาไทย
- Format: `type: คำอธิบาย`
  - `feat:` ฟีเจอร์ใหม่
  - `fix:` แก้บั๊ก
  - `docs:` แก้เอกสาร
  - `chore:` งานเบื้องต้น

---

**อัปเดตล่าสุด:** 11 มกราคม 2026  
**Status:** Production Ready ✓
