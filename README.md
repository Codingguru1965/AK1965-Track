# 🏃 AK1965 Track - Production Android Fitness & Activity Tracker

[![Download Android APK](https://img.shields.io/badge/Download-Android%20APK-00E676?style=for-the-badge&logo=android&logoColor=black)](https://github.com/Codingguru1965/AK1965-Track/releases/download/v1.0.0/AK1965-Track-Release.apk)
[![Backend Status](https://img.shields.io/badge/Backend-Live%20on%20Render-00C7B7?style=for-the-badge&logo=render&logoColor=white)](https://ak1965-track.onrender.com/api/health)
[![Release Version](https://img.shields.io/badge/Version-v1.0.0-blue?style=for-the-badge)](https://github.com/Codingguru1965/AK1965-Track/releases/tag/v1.0.0)

A high-performance, offline-first Android fitness application built with **React Native**, **Native Kotlin Foreground Services**, **SQLite WAL Database**, and an **Express.js + MongoDB Atlas** cloud synchronization backend.

---

## 📲 Direct Mobile Download Link

Click below on your mobile device to download and install the app directly:

👉 [**Download AK1965-Track-Release.apk (v1.0.0)**](https://github.com/Codingguru1965/AK1965-Track/releases/download/v1.0.0/AK1965-Track-Release.apk)

*(Or visit the [Official Releases Page](https://github.com/Codingguru1965/AK1965-Track/releases/tag/v1.0.0))*

---

## ✨ Features & Architecture

* **🏃 3 Activity Types**: Running, Walking, and Cycling.
* **📱 100% Offline Tracking**: Start, record, and save activities with zero internet, mobile data, or Wi-Fi.
* **🔒 Screen-Off & Device-Locked Tracking**: Native Android Foreground Service (`TrackingService.kt`) with wake-locks keeps tracking active without interruption even when the screen is locked.
* **🔔 Live Notification Drawer**: Continuous updates of elapsed workout time, distance (km), and real-time pace/speed.
* **🎯 High-Precision GPS Engine**: Dual-provider GPS (`FusedLocationProviderClient` + `LocationManager.GPS_PROVIDER` fallback) with automatic speed/jitter noise rejection.
* **🔥 MET-Based Calories**: Accurate calorie calculations based on MET values, duration, user body weight, and exercise intensity.
* **💾 Local SQLite Database**: Configured with WAL (`Write-Ahead Logging`) mode and relational schema for instant, lag-free offline queries.
* **☁️ Cloud Synchronization**: Idempotent synchronization engine connects to live Render cloud backend (`https://ak1965-track.onrender.com`) and MongoDB Atlas.

---

## 🛠️ Tech Stack

* **Frontend**: React Native 0.87 (Bridgeless / New Architecture), TypeScript, React Navigation
* **Android Native Core**: Kotlin Foreground Service, SensorManager (Step Counter), LocationManager
* **Local Storage**: SQLite WAL (`@op-engineering/op-sqlite`), Encrypted KeyStore (`react-native-keychain`)
* **Backend API**: Node.js, Express, TypeScript, JWT with refresh tokens, Helmet, CORS
* **Cloud Database**: MongoDB Atlas Cloud
* **Hosting**: Render.com ([https://ak1965-track.onrender.com](https://ak1965-track.onrender.com))

---

## 🏃 Running Locally

### Backend Server
```bash
cd backend
npm install
npm run dev
```

### React Native Android App
```bash
npm install
npx react-native start
npx react-native run-android
```
