import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:open_file/open_file.dart';
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
    final isVideo = message.isVideo;
    final canOpen = isComplete && message.filePath != null && !kIsWeb;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Tappable file info header
        InkWell(
          onTap: canOpen ? () => _openFile(context, message.filePath!) : null,
          borderRadius: BorderRadius.circular(8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isComplete
                    ? (isImage
                        ? Icons.image
                        : isVideo
                            ? Icons.videocam
                            : Icons.insert_drive_file)
                    : Icons.hourglass_empty,
                size: 20,
                color: isComplete ? AppTheme.success : AppTheme.textSecondary,
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  message.fileName ?? 'File',
                  style: TextStyle(
                    fontWeight: FontWeight.w500,
                    color: canOpen ? AppTheme.primary : AppTheme.textPrimary,
                    decoration: canOpen ? TextDecoration.underline : null,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (canOpen) ...[
                const SizedBox(width: 4),
                const Icon(
                  Icons.open_in_new,
                  size: 14,
                  color: AppTheme.primary,
                ),
              ],
            ],
          ),
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

        // Image preview (if complete and is image) - Tappable
        if (isComplete && isImage && message.filePath != null) ...[
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () => _openFile(context, message.filePath!),
            child: Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.file(
                    File(message.filePath!),
                    fit: BoxFit.cover,
                    width: double.infinity,
                    height: 180,
                    errorBuilder: (_, __, ___) => Container(
                      height: 80,
                      color: AppTheme.surfaceLight,
                      child: const Center(
                        child:
                            Icon(Icons.broken_image, color: AppTheme.textMuted),
                      ),
                    ),
                  ),
                ),
                // Tap hint overlay
                Positioned(
                  bottom: 8,
                  right: 8,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.touch_app, size: 12, color: Colors.white),
                        SizedBox(width: 4),
                        Text(
                          'Tap untuk buka',
                          style: TextStyle(color: Colors.white, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],

        // Video preview (if complete and is video) - Tappable
        if (isComplete && isVideo && message.filePath != null) ...[
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () => _openFile(context, message.filePath!),
            child: Container(
              width: double.infinity,
              height: 120,
              decoration: BoxDecoration(
                color: AppTheme.surfaceLight,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.textMuted.withOpacity(0.2)),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Video icon background
                  Icon(
                    Icons.videocam,
                    size: 40,
                    color: AppTheme.textMuted.withOpacity(0.3),
                  ),
                  // Play button
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primary.withOpacity(0.3),
                          blurRadius: 12,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.play_arrow,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  // Tap hint
                  Positioned(
                    bottom: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'Tap untuk putar',
                        style: TextStyle(color: Colors.white, fontSize: 10),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],

        // Action buttons row (if complete)
        if (isComplete && message.filePath != null && !kIsWeb) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Open button
              TextButton.icon(
                onPressed: () => _openFile(context, message.filePath!),
                icon: const Icon(Icons.open_in_new, size: 16),
                label: const Text('Buka'),
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
              const SizedBox(width: 8),
              // Share button
              TextButton.icon(
                onPressed: () => _shareFile(message.filePath!),
                icon: const Icon(Icons.share, size: 16),
                label: const Text('Bagikan'),
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.textSecondary,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Future<void> _openFile(BuildContext context, String path) async {
    try {
      final result = await OpenFile.open(path);
      if (result.type != ResultType.done) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Tidak dapat membuka file: ${result.message}'),
              backgroundColor: AppTheme.error,
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error membuka file: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
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
