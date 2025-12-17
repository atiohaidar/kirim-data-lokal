import 'dart:async';
import 'package:flutter_webrtc/flutter_webrtc.dart';

/// Video quality mode
enum VideoQuality { eco, hd }

/// Video call state
enum VideoCallState { idle, calling, ringing, active }

/// Video statistics data
class VideoStats {
  final int rtt;
  final int fps;
  final int bitrate;
  final int width;
  final int height;
  final int packetsLost;

  VideoStats({
    this.rtt = 0,
    this.fps = 0,
    this.bitrate = 0,
    this.width = 0,
    this.height = 0,
    this.packetsLost = 0,
  });
}

/// Service to handle video call logic using In-Band Renegotiation
class VideoCallService {
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  RTCPeerConnection? _peerConnection;

  // State
  bool _isMuted = false;
  bool _isCameraOff = false;
  bool _isEcoMode = true;
  String _currentCamera = 'user'; // 'user' or 'environment'
  bool _isActive = false;

  // Stats
  Timer? _statsTimer;
  int _lastBytesReceived = 0;
  DateTime _lastStatsTime = DateTime.now();

  // Stream controllers
  final _localStreamController = StreamController<MediaStream>.broadcast();
  final _remoteStreamController = StreamController<MediaStream>.broadcast();
  final _statsController = StreamController<VideoStats>.broadcast();
  final _stateController = StreamController<VideoCallState>.broadcast();

  // Getters
  MediaStream? get localStream => _localStream;
  MediaStream? get remoteStream => _remoteStream;
  bool get isMuted => _isMuted;
  bool get isCameraOff => _isCameraOff;
  bool get isEcoMode => _isEcoMode;
  bool get isActive => _isActive;
  String get currentCamera => _currentCamera;

  Stream<MediaStream> get onLocalStream => _localStreamController.stream;
  Stream<MediaStream> get onRemoteStream => _remoteStreamController.stream;
  Stream<VideoStats> get onStats => _statsController.stream;
  Stream<VideoCallState> get onStateChange => _stateController.stream;

  /// Get media constraints based on current settings
  Map<String, dynamic> _getConstraints() {
    final videoConstraints = _isEcoMode
        ? {
            'width': 640,
            'height': 480,
            'frameRate': 15,
            'facingMode': _currentCamera,
          }
        : {
            'width': 1280,
            'height': 720,
            'frameRate': 30,
            'facingMode': _currentCamera,
          };

    return {
      'video': videoConstraints,
      'audio': {
        'echoCancellation': true,
        'noiseSuppression': true,
      },
    };
  }

  /// Start a video call (Caller)
  /// Returns the renegotiation offer to be sent via data channel
  Future<RTCSessionDescription?> startCall(RTCPeerConnection pc) async {
    _peerConnection = pc;
    _stateController.add(VideoCallState.calling);

    try {
      // 1. Get local stream
      final constraints = _getConstraints();
      _localStream = await navigator.mediaDevices.getUserMedia(constraints);
      _localStreamController.add(_localStream!);

      // 2. Add tracks to existing peer connection
      for (var track in _localStream!.getTracks()) {
        await pc.addTrack(track, _localStream!);
      }

      // 3. Create offer for renegotiation
      final offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      _isActive = true;
      _stateController.add(VideoCallState.active);
      _startStatsPolling();

      return offer;
    } catch (e) {
      _endCallInternal();
      rethrow;
    }
  }

  /// Accept incoming video call (Callee)
  /// Returns the answer to be sent back via data channel
  Future<RTCSessionDescription?> acceptCall(
    RTCPeerConnection pc,
    RTCSessionDescription offer,
  ) async {
    _peerConnection = pc;

    try {
      // 1. Get local stream
      final constraints = _getConstraints();
      _localStream = await navigator.mediaDevices.getUserMedia(constraints);
      _localStreamController.add(_localStream!);

      // 2. Set remote description (the offer)
      await pc.setRemoteDescription(offer);

      // 3. Add our tracks
      for (var track in _localStream!.getTracks()) {
        await pc.addTrack(track, _localStream!);
      }

      // 4. Create answer
      final answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      _isActive = true;
      _stateController.add(VideoCallState.active);
      _startStatsPolling();

      return answer;
    } catch (e) {
      _endCallInternal();
      rethrow;
    }
  }

  /// Handle receiving remote answer (for caller)
  Future<void> handleRemoteAnswer(
    RTCPeerConnection pc,
    RTCSessionDescription answer,
  ) async {
    await pc.setRemoteDescription(answer);
  }

  /// Set remote stream (called when onTrack fires)
  void setRemoteStream(MediaStream stream) {
    _remoteStream = stream;
    _remoteStreamController.add(stream);
  }

  /// End the call
  Future<void> endCall() async {
    await _endCallInternal();
  }

  Future<void> _endCallInternal() async {
    _isActive = false;
    _stateController.add(VideoCallState.idle);

    // Stop stats polling
    _statsTimer?.cancel();
    _statsTimer = null;

    // Stop local tracks
    if (_localStream != null) {
      for (var track in _localStream!.getTracks()) {
        track.stop();
      }
      _localStream?.dispose();
      _localStream = null;
    }

    // Clear remote stream
    _remoteStream = null;

    // Remove tracks from peer connection
    if (_peerConnection != null) {
      final senders = await _peerConnection!.senders;
      for (var sender in senders) {
        _peerConnection!.removeTrack(sender);
      }
    }

    // Reset states
    _isMuted = false;
    _isCameraOff = false;
  }

  // --- Media Controls ---

  /// Toggle audio (mute/unmute)
  void toggleAudio() {
    if (_localStream == null) return;

    final audioTracks = _localStream!.getAudioTracks();
    if (audioTracks.isNotEmpty) {
      _isMuted = !_isMuted;
      audioTracks[0].enabled = !_isMuted;
    }
  }

  /// Toggle video (camera on/off)
  void toggleVideo() {
    if (_localStream == null) return;

    final videoTracks = _localStream!.getVideoTracks();
    if (videoTracks.isNotEmpty) {
      _isCameraOff = !_isCameraOff;
      videoTracks[0].enabled = !_isCameraOff;
    }
  }

  /// Switch camera (front/back)
  Future<void> switchCamera() async {
    if (_localStream == null) return;

    _currentCamera = _currentCamera == 'user' ? 'environment' : 'user';
    await _restartStream();
  }

  /// Toggle quality mode (Eco/HD)
  Future<void> toggleQuality() async {
    if (_localStream == null) return;

    _isEcoMode = !_isEcoMode;
    await _restartStream();
  }

  /// Restart stream with new constraints (for camera switch / quality change)
  Future<void> _restartStream() async {
    if (_localStream == null || _peerConnection == null) return;

    // 1. Stop current tracks
    for (var track in _localStream!.getTracks()) {
      track.stop();
    }

    try {
      // 2. Get new stream
      final newStream =
          await navigator.mediaDevices.getUserMedia(_getConstraints());
      _localStream = newStream;
      _localStreamController.add(newStream);

      // 3. Replace tracks in senders (seamless switch)
      final senders = await _peerConnection!.senders;

      final videoTrack = newStream.getVideoTracks().isNotEmpty
          ? newStream.getVideoTracks()[0]
          : null;
      final audioTrack = newStream.getAudioTracks().isNotEmpty
          ? newStream.getAudioTracks()[0]
          : null;

      for (var sender in senders) {
        if (sender.track?.kind == 'video' && videoTrack != null) {
          await sender.replaceTrack(videoTrack);
        } else if (sender.track?.kind == 'audio' && audioTrack != null) {
          await sender.replaceTrack(audioTrack);
        }
      }

      // 4. Restore mute/camera off states
      if (_isMuted && audioTrack != null) {
        audioTrack.enabled = false;
      }
      if (_isCameraOff && videoTrack != null) {
        videoTrack.enabled = false;
      }
    } catch (e) {
      // Handle error - maybe show toast
      rethrow;
    }
  }

  // --- Stats ---

  void _startStatsPolling() {
    _statsTimer?.cancel();
    _lastBytesReceived = 0;
    _lastStatsTime = DateTime.now();

    _statsTimer = Timer.periodic(const Duration(seconds: 1), (_) async {
      if (_peerConnection == null) return;

      try {
        final stats = await _peerConnection!.getStats();
        int fps = 0, width = 0, height = 0, bitrate = 0, rtt = 0, loss = 0;

        for (var report in stats) {
          final values = report.values;

          if (report.type == 'inbound-rtp' && values['kind'] == 'video') {
            fps = (values['framesPerSecond'] ?? 0).toInt();
            width = (values['frameWidth'] ?? 0).toInt();
            height = (values['frameHeight'] ?? 0).toInt();
            loss = (values['packetsLost'] ?? 0).toInt();

            // Calculate bitrate
            final bytes = (values['bytesReceived'] ?? 0) as int;
            final now = DateTime.now();
            if (_lastBytesReceived > 0) {
              final deltaBytes = bytes - _lastBytesReceived;
              final deltaTime =
                  now.difference(_lastStatsTime).inMilliseconds / 1000;
              if (deltaTime > 0) {
                bitrate = ((deltaBytes * 8) / deltaTime / 1000).round();
              }
            }
            _lastBytesReceived = bytes;
            _lastStatsTime = now;
          }

          if (report.type == 'candidate-pair' &&
              values['state'] == 'succeeded') {
            final rttValue = values['currentRoundTripTime'];
            if (rttValue != null) {
              rtt = ((rttValue as double) * 1000).round();
            }
          }
        }

        _statsController.add(VideoStats(
          rtt: rtt,
          fps: fps,
          bitrate: bitrate,
          width: width,
          height: height,
          packetsLost: loss,
        ));
      } catch (e) {
        // Stats error - ignore
      }
    });
  }

  /// Dispose resources
  Future<void> dispose() async {
    _endCallInternal();
    await _localStreamController.close();
    await _remoteStreamController.close();
    await _statsController.close();
    await _stateController.close();
  }
}
