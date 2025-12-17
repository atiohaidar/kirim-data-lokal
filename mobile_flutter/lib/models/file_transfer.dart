import 'dart:typed_data';

class FileTransferTask {
  final String id;
  final String fileName;
  final int fileSize;
  final String mimeType;
  final int totalChunks;
  final bool isSending;

  int receivedChunks;
  int receivedBytes;
  List<dynamic> chunks;
  String? localPath;
  Uint8List? fileBytes; // For web platform - stores received file bytes

  FileTransferTask({
    required this.id,
    required this.fileName,
    required this.fileSize,
    required this.mimeType,
    required this.totalChunks,
    required this.isSending,
    this.receivedChunks = 0,
    this.receivedBytes = 0,
    List<dynamic>? chunks,
    this.localPath,
    this.fileBytes,
  }) : chunks = chunks ?? List.filled(totalChunks, null);

  double get progress => fileSize > 0 ? receivedBytes / fileSize : 0.0;
  bool get isComplete => receivedChunks >= totalChunks;
}

class TransferStats {
  int bytesSent;
  int bytesReceived;
  int filesSent;
  int filesReceived;
  int messagesSent;
  int messagesReceived;

  TransferStats({
    this.bytesSent = 0,
    this.bytesReceived = 0,
    this.filesSent = 0,
    this.filesReceived = 0,
    this.messagesSent = 0,
    this.messagesReceived = 0,
  });

  void reset() {
    bytesSent = 0;
    bytesReceived = 0;
    filesSent = 0;
    filesReceived = 0;
    messagesSent = 0;
    messagesReceived = 0;
  }
}
