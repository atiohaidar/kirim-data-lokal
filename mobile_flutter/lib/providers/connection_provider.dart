import 'dart:async';
import 'package:flutter/material.dart' hide ConnectionState;
import '../services/webrtc_service.dart';
import '../models/file_transfer.dart';

class ConnectionProvider extends ChangeNotifier {
  WebRTCService _webrtcService = WebRTCService();
  final TransferStats stats = TransferStats();
  StreamSubscription<ConnectionState>? _stateSubscription;

  ConnectionState _state = ConnectionState.disconnected;
  ConnectionRole? _role;
  String? _localSdp;
  String? _error;

  ConnectionState get state => _state;
  ConnectionRole? get role => _role;
  String? get localSdp => _localSdp;
  String? get error => _error;
  bool get isConnected => _state == ConnectionState.connected;

  WebRTCService get webrtcService => _webrtcService;

  ConnectionProvider() {
    _subscribeToStateChanges();
  }

  void _subscribeToStateChanges() {
    _stateSubscription?.cancel();
    _stateSubscription = _webrtcService.onStateChange.listen((state) {
      _state = state;
      notifyListeners();
    });
  }

  /// Start as Host (Sender)
  Future<void> startAsHost() async {
    try {
      _error = null;
      _role = ConnectionRole.host;
      notifyListeners();

      _localSdp = await _webrtcService.initAsHost();
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  /// Start as Guest (Receiver) - process offer
  Future<void> startAsGuest(String offerSdp) async {
    try {
      _error = null;
      _role = ConnectionRole.guest;
      notifyListeners();

      _localSdp = await _webrtcService.initAsGuest(offerSdp);
      notifyListeners();
    } catch (e) {
      _error = 'Kode tidak valid! Pastikan menyalin semua teks.';
      notifyListeners();
    }
  }

  /// Process answer (for host)
  Future<void> processAnswer(String answerSdp) async {
    try {
      _error = null;
      await _webrtcService.setRemoteAnswer(answerSdp);
      notifyListeners();
    } catch (e) {
      _error = 'Kode balasan tidak valid!';
      notifyListeners();
    }
  }

  /// Reset connection
  Future<void> reset() async {
    // Cancel current subscription first
    await _stateSubscription?.cancel();
    _stateSubscription = null;

    // Dispose old service
    await _webrtcService.dispose();

    // Create new service instance
    _webrtcService = WebRTCService();

    // Reset state
    _state = ConnectionState.disconnected;
    _role = null;
    _localSdp = null;
    _error = null;
    stats.reset();

    // Re-subscribe to new service
    _subscribeToStateChanges();

    notifyListeners();
  }

  @override
  void dispose() {
    _stateSubscription?.cancel();
    _webrtcService.dispose();
    super.dispose();
  }
}
