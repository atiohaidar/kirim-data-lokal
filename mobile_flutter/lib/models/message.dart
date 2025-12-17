enum MessageType { text, file, system }

enum MessageSender { me, peer, system }

class ChatMessage {
  final String id;
  final MessageType type;
  final MessageSender sender;
  final String content;
  final DateTime timestamp;

  // For file messages
  final String? fileName;
  final int? fileSize;
  final String? filePath;
  final String? mimeType;
  final double? progress; // 0.0 to 1.0

  ChatMessage({
    required this.id,
    required this.type,
    required this.sender,
    required this.content,
    required this.timestamp,
    this.fileName,
    this.fileSize,
    this.filePath,
    this.mimeType,
    this.progress,
  });

  ChatMessage copyWith({
    String? content,
    String? filePath,
    double? progress,
  }) {
    return ChatMessage(
      id: id,
      type: type,
      sender: sender,
      content: content ?? this.content,
      timestamp: timestamp,
      fileName: fileName,
      fileSize: fileSize,
      filePath: filePath ?? this.filePath,
      mimeType: mimeType,
      progress: progress ?? this.progress,
    );
  }

  bool get isImage => mimeType?.startsWith('image/') ?? false;
  bool get isVideo => mimeType?.startsWith('video/') ?? false;
}
