import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../../config/theme.dart';
import '../../services/video_call_service.dart';

/// Fullscreen video call overlay screen
class VideoCallScreen extends StatefulWidget {
  final VideoCallService videoService;
  final VoidCallback onEndCall;

  const VideoCallScreen({
    super.key,
    required this.videoService,
    required this.onEndCall,
  });

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> {
  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();
  final RTCVideoRenderer _remoteRenderer = RTCVideoRenderer();
  bool _showStats = false;
  VideoStats? _currentStats;

  @override
  void initState() {
    super.initState();
    _initRenderers();
    _setupListeners();
  }

  Future<void> _initRenderers() async {
    await _localRenderer.initialize();
    await _remoteRenderer.initialize();

    // Set initial streams if already available
    if (widget.videoService.localStream != null) {
      _localRenderer.srcObject = widget.videoService.localStream;
    }
    if (widget.videoService.remoteStream != null) {
      _remoteRenderer.srcObject = widget.videoService.remoteStream;
    }
  }

  void _setupListeners() {
    widget.videoService.onLocalStream.listen((stream) {
      if (mounted) {
        setState(() {
          _localRenderer.srcObject = stream;
        });
      }
    });

    widget.videoService.onRemoteStream.listen((stream) {
      if (mounted) {
        setState(() {
          _remoteRenderer.srcObject = stream;
        });
      }
    });

    widget.videoService.onStats.listen((stats) {
      if (mounted) {
        setState(() {
          _currentStats = stats;
        });
      }
    });
  }

  @override
  void dispose() {
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    super.dispose();
  }

  void _endCall() {
    widget.videoService.endCall();
    widget.onEndCall();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Remote Video (Fullscreen)
          Positioned.fill(
            child: RTCVideoView(
              _remoteRenderer,
              objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
            ),
          ),

          // Stats Panel (optional)
          if (_showStats && _currentStats != null)
            Positioned(
              top: 60,
              left: 16,
              child: _buildStatsPanel(),
            ),

          // Local Video (PiP)
          Positioned(
            top: 60,
            right: 16,
            child: Container(
              width: 120,
              height: 160,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white, width: 2),
              ),
              clipBehavior: Clip.hardEdge,
              child: RTCVideoView(
                _localRenderer,
                objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                mirror: widget.videoService.currentCamera == 'user',
              ),
            ),
          ),

          // Control Bar
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: _buildControlBar(),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsPanel() {
    final stats = _currentStats!;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.7),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('RTT: ${stats.rtt}ms', style: _statsStyle),
          Text('FPS: ${stats.fps}', style: _statsStyle),
          Text('Bitrate: ${stats.bitrate} kbps', style: _statsStyle),
          Text('Res: ${stats.width}x${stats.height}', style: _statsStyle),
          Text('Loss: ${stats.packetsLost}', style: _statsStyle),
        ],
      ),
    );
  }

  TextStyle get _statsStyle => const TextStyle(
        color: Colors.white,
        fontSize: 12,
        fontFamily: 'monospace',
      );

  Widget _buildControlBar() {
    final service = widget.videoService;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.6),
        borderRadius: BorderRadius.circular(32),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Stats toggle
          _buildControlButton(
            icon: Icons.info_outline,
            isActive: _showStats,
            onTap: () => setState(() => _showStats = !_showStats),
            tooltip: 'Statistik',
          ),

          // Switch camera
          _buildControlButton(
            icon: Icons.cameraswitch,
            onTap: () async {
              await service.switchCamera();
              setState(() {});
            },
            tooltip: 'Ganti Kamera',
          ),

          // Toggle quality
          _buildControlButton(
            icon: service.isEcoMode ? Icons.bolt : Icons.hd,
            isActive: !service.isEcoMode,
            onTap: () async {
              await service.toggleQuality();
              setState(() {});
            },
            tooltip: service.isEcoMode ? 'Mode Eco' : 'Mode HD',
          ),

          // Toggle mic
          _buildControlButton(
            icon: service.isMuted ? Icons.mic_off : Icons.mic,
            isActive: service.isMuted,
            activeColor: AppTheme.error,
            onTap: () {
              service.toggleAudio();
              setState(() {});
            },
            tooltip: service.isMuted ? 'Unmute' : 'Mute',
          ),

          // Toggle camera
          _buildControlButton(
            icon: service.isCameraOff ? Icons.videocam_off : Icons.videocam,
            isActive: service.isCameraOff,
            activeColor: AppTheme.error,
            onTap: () {
              service.toggleVideo();
              setState(() {});
            },
            tooltip: service.isCameraOff ? 'Nyalakan Kamera' : 'Matikan Kamera',
          ),

          // End call
          _buildControlButton(
            icon: Icons.call_end,
            backgroundColor: AppTheme.error,
            onTap: _endCall,
            tooltip: 'Akhiri',
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required VoidCallback onTap,
    bool isActive = false,
    Color? activeColor,
    Color? backgroundColor,
    String? tooltip,
  }) {
    return Tooltip(
      message: tooltip ?? '',
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: backgroundColor ??
                (isActive
                    ? (activeColor ?? Colors.white.withOpacity(0.3))
                    : Colors.white.withOpacity(0.2)),
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            color: Colors.white,
            size: 24,
          ),
        ),
      ),
    );
  }
}
