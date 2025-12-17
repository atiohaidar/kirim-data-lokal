import 'package:flutter/material.dart';
import '../services/video_call_service.dart';

/// Provider to manage video call state
class VideoCallProvider extends ChangeNotifier {
  final VideoCallService _service = VideoCallService();

  VideoCallState _state = VideoCallState.idle;
  VideoStats? _stats;

  // Getters
  VideoCallService get service => _service;
  VideoCallState get state => _state;
  bool get isActive => _service.isActive;
  bool get isMuted => _service.isMuted;
  bool get isCameraOff => _service.isCameraOff;
  bool get isEcoMode => _service.isEcoMode;
  String get currentCamera => _service.currentCamera;
  VideoStats? get stats => _stats;

  VideoCallProvider() {
    _service.onStateChange.listen((state) {
      _state = state;
      notifyListeners();
    });

    _service.onStats.listen((stats) {
      _stats = stats;
      notifyListeners();
    });
  }

  /// Toggle audio
  void toggleAudio() {
    _service.toggleAudio();
    notifyListeners();
  }

  /// Toggle video
  void toggleVideo() {
    _service.toggleVideo();
    notifyListeners();
  }

  /// Switch camera
  Future<void> switchCamera() async {
    await _service.switchCamera();
    notifyListeners();
  }

  /// Toggle quality
  Future<void> toggleQuality() async {
    await _service.toggleQuality();
    notifyListeners();
  }

  /// End call
  Future<void> endCall() async {
    await _service.endCall();
    notifyListeners();
  }

  @override
  void dispose() {
    _service.dispose();
    super.dispose();
  }
}
