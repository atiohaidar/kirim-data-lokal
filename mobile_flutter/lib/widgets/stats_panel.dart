import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/chat_provider.dart';

class StatsPanel extends StatelessWidget {
  const StatsPanel({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ChatProvider>(
      builder: (context, chatProvider, _) {
        final stats = chatProvider.stats;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            border: Border(
              bottom: BorderSide(color: AppTheme.textMuted.withOpacity(0.1)),
            ),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  const Icon(Icons.bar_chart,
                      color: AppTheme.primary, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Statistik Transfer',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _StatItem(
                    icon: Icons.upload,
                    label: 'Terkirim',
                    value: _formatBytes(stats.bytesSent),
                    color: AppTheme.primary,
                  ),
                  _StatItem(
                    icon: Icons.download,
                    label: 'Diterima',
                    value: _formatBytes(stats.bytesReceived),
                    color: AppTheme.success,
                  ),
                  _StatItem(
                    icon: Icons.folder,
                    label: 'Files',
                    value: '${stats.filesSent}/${stats.filesReceived}',
                    color: AppTheme.warning,
                  ),
                  _StatItem(
                    icon: Icons.message,
                    label: 'Pesan',
                    value: '${stats.messagesSent}/${stats.messagesReceived}',
                    color: AppTheme.textSecondary,
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
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

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
          ),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.textMuted,
                  fontSize: 10,
                ),
          ),
        ],
      ),
    );
  }
}
