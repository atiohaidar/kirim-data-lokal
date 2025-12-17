import 'dart:io';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../config/theme.dart';
import '../models/message.dart';

class MessageBubble extends StatelessWidget {
  final ChatMessage message;

  const MessageBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    if (message.type == MessageType.system) {
      return _buildSystemMessage(context);
    }

    final isMe = message.sender == MessageSender.me;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color:
              isMe ? AppTheme.primary.withOpacity(0.2) : AppTheme.surfaceLight,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: isMe ? const Radius.circular(16) : Radius.zero,
            bottomRight: isMe ? Radius.zero : const Radius.circular(16),
          ),
          border: Border.all(
            color: isMe
                ? AppTheme.primary.withOpacity(0.3)
                : AppTheme.textMuted.withOpacity(0.1),
          ),
        ),
        child: message.type == MessageType.file
            ? _buildFileContent(context, isMe)
            : _buildTextContent(),
      ),
    );
  }

  Widget _buildSystemMessage(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        message.content,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppTheme.textSecondary,
            ),
        textAlign: TextAlign.center,
      ),
    );
  }

  Widget _buildTextContent() {
    return Text(
      message.content,
      style: const TextStyle(
        color: AppTheme.textPrimary,
        fontSize: 15,
      ),
    );
  }

  Widget _buildFileContent(BuildContext context, bool isMe) {
    final progress = message.progress ?? 0.0;
    final isComplete = progress >= 1.0;
    final isImage = message.isImage;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // File info
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isComplete
                  ? (isImage ? Icons.image : Icons.insert_drive_file)
                  : Icons.hourglass_empty,
              size: 20,
              color: isComplete ? AppTheme.success : AppTheme.textSecondary,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                message.fileName ?? 'File',
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textPrimary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),

        if (message.fileSize != null) ...[
          const SizedBox(height: 4),
          Text(
            _formatBytes(message.fileSize!),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.textMuted,
                ),
          ),
        ],

        // Progress bar (if not complete)
        if (!isComplete) ...[
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: AppTheme.surfaceLight,
              valueColor: const AlwaysStoppedAnimation(AppTheme.primary),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${(progress * 100).toInt()}%',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.textMuted,
                ),
          ),
        ],

        // Image preview (if complete and is image)
        if (isComplete && isImage && message.filePath != null) ...[
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.file(
              File(message.filePath!),
              fit: BoxFit.cover,
              width: double.infinity,
              height: 150,
              errorBuilder: (_, __, ___) => Container(
                height: 80,
                color: AppTheme.surfaceLight,
                child: const Center(
                  child: Icon(Icons.broken_image, color: AppTheme.textMuted),
                ),
              ),
            ),
          ),
        ],

        // Share button (if complete and received)
        if (isComplete && !isMe && message.filePath != null) ...[
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: () => _shareFile(message.filePath!),
            icon: const Icon(Icons.share, size: 16),
            label: const Text('Bagikan'),
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.primary,
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
        ],
      ],
    );
  }

  void _shareFile(String path) {
    Share.shareXFiles([XFile(path)]);
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }
}
