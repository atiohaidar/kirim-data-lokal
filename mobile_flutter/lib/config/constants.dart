class AppConstants {
  // File Transfer
  static const int chunkSize = 64 * 1024; // 64KB chunks
  static const int bufferThreshold = 64 * 1024; // Backpressure threshold

  // WebRTC Configuration (no STUN/TURN for fully local)
  static const Map<String, dynamic> rtcConfig = {
    'iceServers': [], // Empty for local network only
  };

  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration iceGatheringTimeout = Duration(seconds: 10);
}
