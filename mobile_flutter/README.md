# Kirim Data - Flutter Mobile App

Aplikasi mobile Flutter untuk transfer file P2P langsung antar perangkat menggunakan WebRTC. **Tanpa server, tanpa internet** (Mode Offline).

## 📱 Fitur

- ✅ **Transfer file P2P** via WebRTC DataChannel
- ✅ **Chat real-time** dengan bubble messages
- ✅ **Progress transfer** untuk file besar
- ✅ **Preview gambar** inline dalam chat
- ✅ **Statistik transfer** (bytes, files, messages)
- ✅ **Dark theme** dengan glassmorphism design

## 🚀 Cara Kerja

Mode Offline menggunakan pertukaran kode SDP secara manual:

1. **Pengirim** membuat "tiket undangan" (SDP Offer)
2. Copy & kirim tiket ke teman (via WA/chat lain)
3. **Penerima** proses tiket & buat "tiket balasan" (SDP Answer)
4. **Pengirim** proses balasan → **Terhubung!**
5. Kirim file, chat, semua lewat koneksi langsung P2P

## 📦 Requirements

- Flutter SDK >= 3.0.0
- Android SDK / iOS development environment

## ⚡ Quick Start

```bash
cd mobile_flutter

# Install dependencies
flutter pub get

# Run on connected device
flutter run

# Build APK (Android)
flutter build apk --release
```

## 📁 Project Structure

```
lib/
├── main.dart                 # Entry point
├── config/
│   ├── theme.dart            # Dark glassmorphism theme
│   └── constants.dart        # Chunk size, timeouts
├── models/
│   ├── message.dart          # Chat message model
│   └── file_transfer.dart    # File transfer task
├── services/
│   ├── webrtc_service.dart   # Core WebRTC (P2P connection)
│   └── file_transfer_service.dart # Chunked file transfer
├── providers/
│   ├── connection_provider.dart  # Connection state
│   └── chat_provider.dart        # Messages & transfers
├── screens/
│   ├── splash_screen.dart
│   ├── home_screen.dart
│   ├── native/
│   │   ├── role_select_screen.dart
│   │   ├── host_ticket_screen.dart
│   │   └── join_ticket_screen.dart
│   └── chat/
│       └── chat_screen.dart
└── widgets/
    ├── glass_card.dart
    ├── message_bubble.dart
    └── stats_panel.dart
```

## 🔧 Dependencies

| Package | Use Case |
|---------|----------|
| flutter_webrtc | WebRTC for P2P connections |
| provider | State management |
| file_picker | Pick files to send |
| path_provider | Save received files |
| share_plus | Share received files |
| google_fonts | Inter font family |
| uuid | Generate unique IDs |

## 📝 Notes

- **Fully local**: Tidak ada server signaling, pertukaran SDP manual
- **Chunked transfer**: File besar dipecah 64KB chunks
- **Cross-platform**: Android, iOS, Windows, macOS, Linux

## 🔗 Related

- [Web Version](../index.html) - Mode Online dengan PeerJS
- [Native Web Version](../native.html) - Mode Offline untuk browser
