import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../config/constants.dart';

enum ConnectionState { disconnected, connecting, connected }

enum ConnectionRole { host, guest }

class WebRTCService {
  RTCPeerConnection? _peerConnection;
  RTCDataChannel? _dataChannel;

  ConnectionState _state = ConnectionState.disconnected;
  ConnectionRole? _role;
  bool _disposed = false;

  final _stateController = StreamController<ConnectionState>.broadcast();
  final _messageController = StreamController<dynamic>.broadcast();
  final _sdpController = StreamController<String>.broadcast();

  // Video call support
  final _videoSignalController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _remoteStreamController = StreamController<MediaStream>.broadcast();

  Stream<ConnectionState> get onStateChange => _stateController.stream;
  Stream<dynamic> get onMessage => _messageController.stream;
  Stream<String> get onLocalSdp => _sdpController.stream;

  // Video call streams
  Stream<Map<String, dynamic>> get onVideoSignal =>
      _videoSignalController.stream;
  Stream<MediaStream> get onRemoteStream => _remoteStreamController.stream;

  ConnectionState get state => _state;
  ConnectionRole? get role => _role;
  bool get isConnected => _state == ConnectionState.connected;

  // Expose peer connection for video renegotiation
  RTCPeerConnection? get peerConnection => _peerConnection;

  void _setState(ConnectionState newState) {
    if (_disposed || _stateController.isClosed) return;
    _state = newState;
    _stateController.add(newState);
  }

  /// Initialize as Host (creates offer)
  Future<String> initAsHost() async {
    _role = ConnectionRole.host;
    _setState(ConnectionState.connecting);

    await _createPeerConnection();

    // Create data channel first (host creates it)
    _dataChannel = await _peerConnection!.createDataChannel(
      'chat',
      RTCDataChannelInit(),
    );
    _setupDataChannel(_dataChannel!);

    // Create offer
    final offer = await _peerConnection!.createOffer();
    await _peerConnection!.setLocalDescription(offer);

    // Wait for ICE gathering
    await _waitForIceGathering();

    final localDesc = await _peerConnection!.getLocalDescription();
    return jsonEncode({
      'sdp': localDesc!.sdp,
      'type': localDesc.type,
    });
  }

  /// Initialize as Guest (receives offer, creates answer)
  Future<String> initAsGuest(String offerSdp) async {
    _role = ConnectionRole.guest;
    _setState(ConnectionState.connecting);

    await _createPeerConnection();

    // Guest receives data channel
    _peerConnection!.onDataChannel = (channel) {
      _dataChannel = channel;
      _setupDataChannel(channel);
    };

    // Parse and set remote offer
    final offerData = jsonDecode(offerSdp);
    final offer = RTCSessionDescription(offerData['sdp'], offerData['type']);
    await _peerConnection!.setRemoteDescription(offer);

    // Create answer
    final answer = await _peerConnection!.createAnswer();
    await _peerConnection!.setLocalDescription(answer);

    // Wait for ICE gathering
    await _waitForIceGathering();

    final localDesc = await _peerConnection!.getLocalDescription();
    return jsonEncode({
      'sdp': localDesc!.sdp,
      'type': localDesc.type,
    });
  }

  /// Set remote answer (for host after receiving guest's answer)
  Future<void> setRemoteAnswer(String answerSdp) async {
    final answerData = jsonDecode(answerSdp);
    final answer = RTCSessionDescription(answerData['sdp'], answerData['type']);
    await _peerConnection!.setRemoteDescription(answer);
  }

  Future<void> _createPeerConnection() async {
    _peerConnection = await createPeerConnection(
      AppConstants.rtcConfig,
      {},
    );

    _peerConnection!.onIceConnectionState = (state) {
      if (_disposed) return;
      if (state == RTCIceConnectionState.RTCIceConnectionStateConnected ||
          state == RTCIceConnectionState.RTCIceConnectionStateCompleted) {
        _setState(ConnectionState.connected);
      } else if (state ==
              RTCIceConnectionState.RTCIceConnectionStateDisconnected ||
          state == RTCIceConnectionState.RTCIceConnectionStateFailed ||
          state == RTCIceConnectionState.RTCIceConnectionStateClosed) {
        _setState(ConnectionState.disconnected);
      }
    };

    // Handle incoming video tracks for renegotiation
    _peerConnection!.onTrack = (event) {
      if (_disposed) return;
      if (event.streams.isNotEmpty) {
        _remoteStreamController.add(event.streams[0]);
      }
    };
  }

  Future<void> _waitForIceGathering() async {
    if (_peerConnection!.iceGatheringState ==
        RTCIceGatheringState.RTCIceGatheringStateComplete) {
      return;
    }

    final completer = Completer<void>();

    _peerConnection!.onIceGatheringState = (state) {
      if (state == RTCIceGatheringState.RTCIceGatheringStateComplete) {
        if (!completer.isCompleted) completer.complete();
      }
    };

    // Timeout after 10 seconds
    await completer.future.timeout(
      AppConstants.iceGatheringTimeout,
      onTimeout: () {},
    );
  }

  // Video signal types for filtering
  static const _videoSignalTypes = [
    'video-offer',
    'video-answer',
    'video-end',
    'video-reject',
  ];

  void _setupDataChannel(RTCDataChannel channel) {
    channel.onDataChannelState = (state) {
      if (_disposed) return;
      if (state == RTCDataChannelState.RTCDataChannelOpen) {
        _setState(ConnectionState.connected);
      } else if (state == RTCDataChannelState.RTCDataChannelClosed) {
        _setState(ConnectionState.disconnected);
      }
    };

    channel.onMessage = (message) {
      if (_disposed || _messageController.isClosed) return;
      if (message.isBinary) {
        _messageController.add(message.binary);
      } else {
        // Check if it's a video signal
        try {
          final json = jsonDecode(message.text);
          if (json is Map<String, dynamic> &&
              _videoSignalTypes.contains(json['type'])) {
            // Route to video signal controller
            if (!_videoSignalController.isClosed) {
              _videoSignalController.add(json);
            }
            return;
          }
        } catch (_) {
          // Not JSON or not a video signal, treat as regular message
        }
        _messageController.add(message.text);
      }
    };
  }

  /// Send text message
  void sendText(String text) {
    if (_dataChannel?.state == RTCDataChannelState.RTCDataChannelOpen) {
      _dataChannel!.send(RTCDataChannelMessage(text));
    }
  }

  /// Send binary data (for file chunks)
  void sendBinary(Uint8List data) {
    if (_dataChannel?.state == RTCDataChannelState.RTCDataChannelOpen) {
      _dataChannel!.send(RTCDataChannelMessage.fromBinary(data));
    }
  }

  /// Send JSON message
  void sendJson(Map<String, dynamic> data) {
    sendText(jsonEncode(data));
  }

  /// Get buffered amount for backpressure
  int get bufferedAmount => 0; // flutter_webrtc doesn't expose this directly

  /// Dispose resources
  Future<void> dispose() async {
    _disposed = true; // Mark as disposed first
    _state = ConnectionState.disconnected;

    await _dataChannel?.close();
    await _peerConnection?.close();
    _dataChannel = null;
    _peerConnection = null;

    await _stateController.close();
    await _messageController.close();
    await _sdpController.close();
    await _videoSignalController.close();
    await _remoteStreamController.close();
  }
}
