# 🏍️ RideGuard — Rider Safety System

A mobile-first web application for motorcycle rider safety, featuring fall detection via Bluetooth, real-time emergency alerts, and family monitoring.

---

## 📁 File Structure

```
rideguard/
├── index.html      ← Main app (auth + dashboard in one SPA)
├── style.css       ← Full mobile-first design system
├── app.js          ← Auth, BLE, fall detection, realtime logic
├── supabase.js     ← Supabase client + all DB helpers
├── manifest.json   ← PWA manifest
└── README.md       ← This file
```

---

## 🚀 Setup in 3 Steps

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Copy your **Project URL** and **anon public key** from:
   - `Settings → API → Project URL`
   - `Settings → API → Project API Keys → anon public`

### Step 2 — Configure supabase.js

Open `supabase.js` and replace these two lines:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### Step 3 — Run the SQL Schema

In your Supabase dashboard, go to **SQL Editor** and run:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'rider' CHECK (role IN ('rider', 'family')),
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  custom_message TEXT DEFAULT 'I may need help. Please check on me.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'CONFIRMED',
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own profile"
  ON public.users FOR ALL USING (auth.uid() = id);

CREATE POLICY "Authenticated can read users"
  ON public.users FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own alerts"
  ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can read alerts"
  ON public.alerts FOR SELECT USING (auth.role() = 'authenticated');

-- Enable realtime on alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
```

---

## 🌐 Deploy to GitHub Pages

1. Create a new GitHub repository
2. Upload all files to the root of the repo
3. Go to **Settings → Pages**
4. Set source to **main branch / root**
5. Your app will be live at `https://yourusername.github.io/rideguard/`

> ✅ No Node.js, no build step, no backend needed.

---

## 📡 ESP32 Bluetooth Setup

Your ESP32 firmware must:
- Advertise as **"RideGuard"** or a name starting with **"RG-"**
- Expose a BLE Service with UUID: `12345678-1234-1234-1234-123456789abc`
- Expose a Characteristic with UUID: `87654321-4321-4321-4321-cba987654321`
- Send notify messages: `"FALL_DETECTED"` or `"SAFE"`
- Accept write messages: `"CANCEL"` or `"CONFIRM"`

### Sample ESP32 Arduino Code

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define CHARACTERISTIC_UUID "87654321-4321-4321-4321-cba987654321"

BLECharacteristic *pCharacteristic;
bool deviceConnected = false;

void setup() {
  BLEDevice::init("RideGuard");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();
}

void loop() {
  // When fall detected (e.g. MPU-6050 threshold exceeded):
  // pCharacteristic->setValue("FALL_DETECTED");
  // pCharacteristic->notify();
  delay(1000);
}
```

---

## 📱 Features

| Feature | Description |
|---|---|
| 🔐 Auth | Email/password via Supabase Auth |
| 📡 Bluetooth | Web Bluetooth API for ESP32 helmet |
| ⚠️ Fall Detection | BLE message triggers 15s countdown overlay |
| 🚨 Emergency Alert | Inserts alert to Supabase, sends via realtime |
| 👨‍👩‍👧 Family Portal | Real-time rider status for family members |
| 📋 History | Full alert log with timestamps |
| 🔔 Realtime | Supabase Realtime subscription for live updates |
| 🔊 Alarm | Web Audio API-powered alert sound |
| 📲 PWA | Installable as a mobile app |

---

## ⚠️ Browser Support

- **Web Bluetooth**: Chrome on Android / Chrome OS / macOS
- **Web Audio**: All modern browsers
- **Supabase Realtime**: All modern browsers (WebSocket)

> For best results, use **Chrome on Android**.

---

## 🛡️ Safety & Privacy

- All data stored in your own Supabase project
- Row Level Security enabled on all tables
- No third-party tracking
- Open source — inspect every line

---

*Built with ❤️ for rider safety. Stay protected, ride smart.*
