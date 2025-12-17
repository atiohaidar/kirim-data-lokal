import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Dialog shown when receiving an incoming video call
class IncomingCallDialog extends StatelessWidget {
  final String callerId;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const IncomingCallDialog({
    super.key,
    required this.callerId,
    required this.onAccept,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primary.withOpacity(0.3),
              blurRadius: 20,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.videocam,
                size: 40,
                color: AppTheme.primary,
              ),
            ),
            const SizedBox(height: 20),

            // Title
            const Text(
              '📞 Panggilan Video',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),

            // Caller ID
            Text(
              'Dari: $callerId',
              style: TextStyle(
                fontSize: 16,
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 24),

            // Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // Reject button
                _buildActionButton(
                  icon: Icons.call_end,
                  label: 'Tolak',
                  color: AppTheme.error,
                  onTap: onReject,
                ),

                // Accept button
                _buildActionButton(
                  icon: Icons.videocam,
                  label: 'Terima',
                  color: AppTheme.success,
                  onTap: onAccept,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

/// Show incoming call dialog
Future<bool?> showIncomingCallDialog(
  BuildContext context, {
  required String callerId,
}) {
  return showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (context) => IncomingCallDialog(
      callerId: callerId,
      onAccept: () => Navigator.of(context).pop(true),
      onReject: () => Navigator.of(context).pop(false),
    ),
  );
}
