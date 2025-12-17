import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:uuid/uuid.dart';
import '../config/constants.dart';
import '../models/file_transfer.dart';

typedef SendFunction = void Function(dynamic data);
typedef ProgressCallback = void Function(double progress);

class FileTransferService {
  final Map<String, FileTransferTask> _incomingTransfers = {};
  final Map<String, FileTransferTask> _outgoingTransfers = {};

  final _fileCompleteController =
      StreamController<FileTransferTask>.broadcast();
  final _progressController = StreamController<FileTransferTask>.broadcast();

  Stream<FileTransferTask> get onFileComplete => _fileCompleteController.stream;
  Stream<FileTransferTask> get onProgress => _progressController.stream;

  /// Send a file with chunked transfer
  Future<void> sendFile(
    File file,
    SendFunction sendJson,
    SendFunction sendBinary,
    ProgressCallback? onProgress,
  ) async {
    final fileId = const Uuid().v4();
    final fileName = file.path.split('/').last.split('\\').last;
    final fileSize = await file.length();
    final mimeType = _getMimeType(fileName);
    final totalChunks = (fileSize / AppConstants.chunkSize).ceil();

    final task = FileTransferTask(
      id: fileId,
      fileName: fileName,
      fileSize: fileSize,
      mimeType: mimeType,
      totalChunks: totalChunks,
      isSending: true,
    );
    _outgoingTransfers[fileId] = task;

    // Send metadata first
    sendJson({
      'type': 'file-meta',
      'fileId': fileId,
      'name': fileName,
      'size': fileSize,
      'fileType': mimeType,
      'totalChunks': totalChunks,
    });

    // Read and send chunks
    final randomAccess = await file.open();
    int offset = 0;
    int chunkIndex = 0;

    try {
      while (offset < fileSize) {
        final remaining = fileSize - offset;
        final chunkLength = remaining < AppConstants.chunkSize
            ? remaining
            : AppConstants.chunkSize;

        await randomAccess.setPosition(offset);
        final chunk = await randomAccess.read(chunkLength);

        sendBinary(Uint8List.fromList(chunk));

        offset += chunkLength;
        chunkIndex++;
        task.receivedBytes = offset;
        task.receivedChunks = chunkIndex;

        onProgress?.call(task.progress);
        _progressController.add(task);

        // Small delay to prevent overwhelming
        if (chunkIndex % 10 == 0) {
          await Future.delayed(const Duration(milliseconds: 1));
        }
      }
    } finally {
      await randomAccess.close();
    }

    _outgoingTransfers.remove(fileId);
  }

  /// Send a file from bytes (for web platform)
  Future<void> sendFileFromBytes(
    Uint8List bytes,
    String fileName,
    SendFunction sendJson,
    SendFunction sendBinary,
    ProgressCallback? onProgress,
  ) async {
    final fileId = const Uuid().v4();
    final fileSize = bytes.length;
    final mimeType = _getMimeType(fileName);
    final totalChunks = (fileSize / AppConstants.chunkSize).ceil();

    final task = FileTransferTask(
      id: fileId,
      fileName: fileName,
      fileSize: fileSize,
      mimeType: mimeType,
      totalChunks: totalChunks,
      isSending: true,
    );
    _outgoingTransfers[fileId] = task;

    // Send metadata first
    sendJson({
      'type': 'file-meta',
      'fileId': fileId,
      'name': fileName,
      'size': fileSize,
      'fileType': mimeType,
      'totalChunks': totalChunks,
    });

    // Send in chunks
    int offset = 0;
    int chunkIndex = 0;

    while (offset < fileSize) {
      final remaining = fileSize - offset;
      final chunkLength = remaining < AppConstants.chunkSize
          ? remaining
          : AppConstants.chunkSize;

      final chunk = bytes.sublist(offset, offset + chunkLength);
      sendBinary(Uint8List.fromList(chunk));

      offset += chunkLength;
      chunkIndex++;
      task.receivedBytes = offset;
      task.receivedChunks = chunkIndex;

      onProgress?.call(task.progress);
      _progressController.add(task);

      // Small delay to prevent overwhelming
      if (chunkIndex % 10 == 0) {
        await Future.delayed(const Duration(milliseconds: 1));
      }
    }

    _outgoingTransfers.remove(fileId);
  }

  /// Handle incoming file metadata
  void handleFileMeta(Map<String, dynamic> meta) {
    final task = FileTransferTask(
      id: meta['fileId'],
      fileName: meta['name'],
      fileSize: meta['size'],
      mimeType: meta['fileType'] ?? 'application/octet-stream',
      totalChunks: meta['totalChunks'],
      isSending: false,
    );
    _incomingTransfers[task.id] = task;
    _incomingTransfers['currentId'] = task; // Track current for binary chunks
  }

  /// Handle incoming file chunk (binary)
  Future<String?> handleFileChunk(Uint8List chunkData, String savePath) async {
    final currentTask = _incomingTransfers['currentId'] as FileTransferTask?;
    if (currentTask == null) return null;

    final task = _incomingTransfers[currentTask.id];
    if (task == null) return null;

    task.chunks[task.receivedChunks] = chunkData;
    task.receivedChunks++;
    task.receivedBytes += chunkData.length;

    _progressController.add(task);

    // Check if complete
    if (task.isComplete) {
      // Combine all chunks into bytes
      final allBytes = BytesBuilder();
      for (final chunk in task.chunks) {
        if (chunk is Uint8List) {
          allBytes.add(chunk);
        }
      }
      task.fileBytes = allBytes.toBytes();

      if (kIsWeb) {
        // On web, we can't save to file system
        // Store bytes in task and let UI handle download
        task.localPath = 'web://download/${task.fileName}';
      } else {
        // On mobile/desktop, save to file system
        final filePath = '$savePath/${task.fileName}';
        final file = File(filePath);
        await file.writeAsBytes(task.fileBytes!);
        task.localPath = filePath;
      }

      _incomingTransfers.remove(task.id);
      _incomingTransfers.remove('currentId');

      _fileCompleteController.add(task);
      return task.localPath;
    }

    return null;
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
      case 'webp':
        return 'image/webp';
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'pdf':
        return 'application/pdf';
      case 'txt':
        return 'text/plain';
      case 'zip':
        return 'application/zip';
      default:
        return 'application/octet-stream';
    }
  }

  void dispose() {
    _fileCompleteController.close();
    _progressController.close();
  }
}
