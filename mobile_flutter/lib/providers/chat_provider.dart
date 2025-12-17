import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import '../models/message.dart';
import '../models/file_transfer.dart';
import '../services/webrtc_service.dart';
import '../services/file_transfer_service.dart';

class ChatProvider extends ChangeNotifier {
  final List<ChatMessage> _messages = [];
  final FileTransferService _fileService = FileTransferService();
  final TransferStats stats = TransferStats();

  WebRTCService? _webrtcService;
  String? _savePath;
  bool _initialized = false;

  // Track subscriptions to cancel them on re-init
  StreamSubscription? _messageSubscription;
  StreamSubscription? _progressSubscription;
  StreamSubscription? _completeSubscription;

  List<ChatMessage> get messages => List.unmodifiable(_messages);
  String? get savePath => _savePath;

  /// Initialize with WebRTC service and optional custom save path
  void init(WebRTCService webrtcService, {String? customSavePath}) {
    // Prevent duplicate initialization
    if (_initialized && _webrtcService == webrtcService) return;

    // Cancel old subscriptions if re-initializing
    _messageSubscription?.cancel();
    _progressSubscription?.cancel();
    _completeSubscription?.cancel();

    _webrtcService = webrtcService;
    _initialized = true;

    // Listen to incoming messages
    _messageSubscription =
        _webrtcService!.onMessage.listen(_handleIncomingMessage);

    // Listen to file transfer progress
    _progressSubscription = _fileService.onProgress.listen((task) {
      _updateFileProgress(task);
    });

    // Listen to file complete
    _completeSubscription = _fileService.onFileComplete.listen((task) {
      _handleFileComplete(task);
    });

    // Initialize save path (skip for web)
    if (!kIsWeb) {
      _initSavePath(customSavePath);
    }

    // Add system message only on first init
    if (_messages.isEmpty ||
        _messages.first.content != '✅ Terhubung! Siap kirim file.') {
      addSystemMessage('✅ Terhubung! Siap kirim file.');
    }
  }

  /// Set save path (can be called externally to update)
  void setSavePath(String? path) {
    if (path != null && path.isNotEmpty) {
      _savePath = path;
    }
  }

  Future<void> _initSavePath(String? customPath) async {
    if (customPath != null && customPath.isNotEmpty) {
      _savePath = customPath;
      try {
        await Directory(_savePath!).create(recursive: true);
      } catch (e) {
        debugPrint('Error creating save directory: $e');
      }
      return;
    }

    try {
      final dir = await getApplicationDocumentsDirectory();
      _savePath = '${dir.path}/KirimData';
      await Directory(_savePath!).create(recursive: true);
    } catch (e) {
      // Fallback for platforms where path_provider doesn't work
      debugPrint('path_provider error: $e');
    }
  }

  void _handleIncomingMessage(dynamic data) {
    if (data is String) {
      try {
        final json = jsonDecode(data);
        if (json['type'] == 'file-meta') {
          _fileService.handleFileMeta(json);
          _addFileReceivingMessage(json);
        } else {
          // Regular text message
          _addPeerMessage(data);
        }
      } catch (_) {
        // Plain text message
        _addPeerMessage(data);
      }
    } else if (data is Uint8List) {
      // Binary file chunk
      _fileService.handleFileChunk(data, _savePath ?? '');
    }
  }

  void _addPeerMessage(String text) {
    final message = ChatMessage(
      id: const Uuid().v4(),
      type: MessageType.text,
      sender: MessageSender.peer,
      content: text,
      timestamp: DateTime.now(),
    );
    _messages.add(message);
    stats.messagesReceived++;
    notifyListeners();
  }

  void _addFileReceivingMessage(Map<String, dynamic> meta) {
    final message = ChatMessage(
      id: meta['fileId'],
      type: MessageType.file,
      sender: MessageSender.peer,
      content: '📥 Menerima file...',
      timestamp: DateTime.now(),
      fileName: meta['name'],
      fileSize: meta['size'],
      mimeType: meta['fileType'],
      progress: 0.0,
    );
    _messages.add(message);
    notifyListeners();
  }

  void _updateFileProgress(FileTransferTask task) {
    final index = _messages.indexWhere((m) => m.id == task.id);
    if (index != -1) {
      _messages[index] = _messages[index].copyWith(progress: task.progress);
      notifyListeners();
    }
  }

  void _handleFileComplete(FileTransferTask task) {
    final index = _messages.indexWhere((m) => m.id == task.id);
    if (index != -1) {
      _messages[index] = _messages[index].copyWith(
        content: '✅ ${task.fileName}',
        filePath: task.localPath,
        progress: 1.0,
      );
      stats.filesReceived++;
      stats.bytesReceived += task.fileSize;
      notifyListeners();
    }
  }

  /// Send text message
  void sendMessage(String text) {
    if (text.isEmpty || _webrtcService == null) return;

    _webrtcService!.sendText(text);

    final message = ChatMessage(
      id: const Uuid().v4(),
      type: MessageType.text,
      sender: MessageSender.me,
      content: text,
      timestamp: DateTime.now(),
    );
    _messages.add(message);
    stats.messagesSent++;
    notifyListeners();
  }

  /// Send file
  Future<void> sendFile(File file) async {
    if (_webrtcService == null) return;

    final fileId = const Uuid().v4();
    final fileName = file.path.split('/').last.split('\\').last;
    final fileSize = await file.length();
    final mimeType = _getMimeType(fileName);

    // Add sending message
    final message = ChatMessage(
      id: fileId,
      type: MessageType.file,
      sender: MessageSender.me,
      content: '📤 Mengirim...',
      timestamp: DateTime.now(),
      fileName: fileName,
      fileSize: fileSize,
      mimeType: mimeType,
      filePath: file.path,
      progress: 0.0,
    );
    _messages.add(message);
    notifyListeners();

    // Send file
    try {
      await _fileService.sendFile(
        file,
        (data) => _webrtcService!.sendJson(data as Map<String, dynamic>),
        (data) => _webrtcService!.sendBinary(data as Uint8List),
        (progress) {
          final index = _messages.indexWhere((m) => m.id == fileId);
          if (index != -1) {
            _messages[index] = _messages[index].copyWith(progress: progress);
            notifyListeners();
          }
        },
      );

      // Update to complete
      final index = _messages.indexWhere((m) => m.id == fileId);
      if (index != -1) {
        _messages[index] = _messages[index].copyWith(
          content: '✅ $fileName',
          progress: 1.0,
        );
        stats.filesSent++;
        stats.bytesSent += fileSize;
        notifyListeners();
      }
    } catch (e) {
      final index = _messages.indexWhere((m) => m.id == fileId);
      if (index != -1) {
        _messages[index] = _messages[index].copyWith(
          content: '❌ Gagal: $fileName',
        );
        notifyListeners();
      }
    }
  }

  /// Send file from bytes (for web platform)
  Future<void> sendFileFromBytes(Uint8List bytes, String fileName) async {
    if (_webrtcService == null) return;

    final fileId = const Uuid().v4();
    final fileSize = bytes.length;
    final mimeType = _getMimeType(fileName);

    // Add sending message
    final message = ChatMessage(
      id: fileId,
      type: MessageType.file,
      sender: MessageSender.me,
      content: '📤 Mengirim...',
      timestamp: DateTime.now(),
      fileName: fileName,
      fileSize: fileSize,
      mimeType: mimeType,
      progress: 0.0,
    );
    _messages.add(message);
    notifyListeners();

    // Send file
    try {
      await _fileService.sendFileFromBytes(
        bytes,
        fileName,
        (data) => _webrtcService!.sendJson(data as Map<String, dynamic>),
        (data) => _webrtcService!.sendBinary(data as Uint8List),
        (progress) {
          final index = _messages.indexWhere((m) => m.id == fileId);
          if (index != -1) {
            _messages[index] = _messages[index].copyWith(progress: progress);
            notifyListeners();
          }
        },
      );

      // Update to complete
      final index = _messages.indexWhere((m) => m.id == fileId);
      if (index != -1) {
        _messages[index] = _messages[index].copyWith(
          content: '✅ $fileName',
          progress: 1.0,
        );
        stats.filesSent++;
        stats.bytesSent += fileSize;
        notifyListeners();
      }
    } catch (e) {
      final index = _messages.indexWhere((m) => m.id == fileId);
      if (index != -1) {
        _messages[index] = _messages[index].copyWith(
          content: '❌ Gagal: $fileName',
        );
        notifyListeners();
      }
    }
  }

  /// Add system message
  void addSystemMessage(String text) {
    final message = ChatMessage(
      id: const Uuid().v4(),
      type: MessageType.system,
      sender: MessageSender.system,
      content: text,
      timestamp: DateTime.now(),
    );
    _messages.add(message);
    notifyListeners();
  }

  String _getMimeType(String fileName) {
    final ext = fileName.split('.').last.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'mp4':
        return 'video/mp4';
      default:
        return 'application/octet-stream';
    }
  }

  void clear() {
    _messages.clear();
    stats.reset();
    _initialized = false;
    _messageSubscription?.cancel();
    _progressSubscription?.cancel();
    _completeSubscription?.cancel();
    notifyListeners();
  }

  @override
  void dispose() {
    _messageSubscription?.cancel();
    _progressSubscription?.cancel();
    _completeSubscription?.cancel();
    _fileService.dispose();
    super.dispose();
  }
}
