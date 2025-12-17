import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/settings_provider.dart';
import '../../widgets/glass_card.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pengaturan'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppTheme.background, AppTheme.surface],
          ),
        ),
        child: SafeArea(
          child: Consumer<SettingsProvider>(
            builder: (context, settings, _) {
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Storage Section
                  _buildSectionHeader(context, '📁 Penyimpanan'),
                  const SizedBox(height: 12),

                  GlassCard(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Current save location
                          Text(
                            'Lokasi Penyimpanan',
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            settings.currentSavePath ?? 'Memuat...',
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: AppTheme.textSecondary,
                                      fontFamily: 'monospace',
                                    ),
                          ),
                          const SizedBox(height: 16),

                          // Location options
                          if (!kIsWeb) ...[
                            _buildLocationOption(
                              context,
                              settings,
                              SaveLocation.internal,
                              'Internal App',
                              'Tersimpan dalam folder aplikasi',
                              Icons.folder_special,
                            ),
                            const SizedBox(height: 8),
                            _buildLocationOption(
                              context,
                              settings,
                              SaveLocation.downloads,
                              'Downloads',
                              'Tersimpan di folder Downloads publik',
                              Icons.download,
                            ),
                          ] else ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.info_outline,
                                      color: AppTheme.primary, size: 20),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      'Di browser, file akan otomatis ter-download ke folder Downloads default.',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: AppTheme.textSecondary,
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Storage Info
                  _buildSectionHeader(context, '📊 Info Penyimpanan'),
                  const SizedBox(height: 12),

                  GlassCard(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _buildInfoRow(
                            context,
                            'File Tersimpan',
                            '${settings.savedFilesCount} file',
                            Icons.insert_drive_file,
                          ),
                          const Divider(color: AppTheme.textMuted, height: 24),
                          _buildInfoRow(
                            context,
                            'Penggunaan Storage',
                            settings.formatBytes(settings.totalStorageUsed),
                            Icons.storage,
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () =>
                                      settings.refreshStorageInfo(),
                                  icon: const Icon(Icons.refresh, size: 18),
                                  label: const Text('Refresh'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppTheme.textSecondary,
                                    side: BorderSide(
                                      color:
                                          AppTheme.textMuted.withOpacity(0.3),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: settings.savedFilesCount > 0
                                      ? () => _showClearCacheDialog(
                                          context, settings)
                                      : null,
                                  icon: const Icon(Icons.delete_outline,
                                      size: 18),
                                  label: const Text('Hapus Cache'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.error,
                                    foregroundColor: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Behavior Settings
                  _buildSectionHeader(context, '⚙️ Perilaku'),
                  const SizedBox(height: 12),

                  GlassCard(
                    child: Column(
                      children: [
                        SwitchListTile(
                          title: const Text('Buka file otomatis'),
                          subtitle: Text(
                            'Buka file setelah selesai diterima',
                            style: TextStyle(
                                color: AppTheme.textSecondary, fontSize: 12),
                          ),
                          value: settings.autoOpenFiles,
                          onChanged: (value) =>
                              settings.setAutoOpenFiles(value),
                          activeColor: AppTheme.primary,
                        ),
                        const Divider(color: AppTheme.textMuted, height: 1),
                        SwitchListTile(
                          title: const Text('Notifikasi'),
                          subtitle: Text(
                            'Tampilkan notifikasi saat file diterima',
                            style: TextStyle(
                                color: AppTheme.textSecondary, fontSize: 12),
                          ),
                          value: settings.showNotifications,
                          onChanged: (value) =>
                              settings.setShowNotifications(value),
                          activeColor: AppTheme.primary,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // About Section
                  _buildSectionHeader(context, 'ℹ️ Tentang'),
                  const SizedBox(height: 12),

                  GlassCard(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _buildInfoRow(context, 'Versi Aplikasi', '1.0.0',
                              Icons.info_outline),
                          const Divider(color: AppTheme.textMuted, height: 24),
                          _buildInfoRow(
                              context, 'Teknologi', 'WebRTC P2P', Icons.hub),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
    );
  }

  Widget _buildLocationOption(
    BuildContext context,
    SettingsProvider settings,
    SaveLocation location,
    String title,
    String subtitle,
    IconData icon,
  ) {
    final isSelected = settings.saveLocation == location;

    return InkWell(
      onTap: () => settings.setSaveLocation(location),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primary.withOpacity(0.1)
              : AppTheme.surfaceLight.withOpacity(0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.primary : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: (isSelected ? AppTheme.primary : AppTheme.textMuted)
                    .withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: isSelected ? AppTheme.primary : null,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppTheme.textSecondary,
                        ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle, color: AppTheme.primary, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(
    BuildContext context,
    String label,
    String value,
    IconData icon,
  ) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.textSecondary, size: 20),
        const SizedBox(width: 12),
        Text(
          label,
          style: TextStyle(color: AppTheme.textSecondary),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  void _showClearCacheDialog(BuildContext context, SettingsProvider settings) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Hapus Cache?'),
        content: Text(
          'Semua file yang tersimpan (${settings.savedFilesCount} file, ${settings.formatBytes(settings.totalStorageUsed)}) akan dihapus permanen.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await settings.clearCache();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('✅ Cache berhasil dihapus'),
                    backgroundColor: AppTheme.success,
                  ),
                );
              }
            },
            child: const Text('Hapus', style: TextStyle(color: AppTheme.error)),
          ),
        ],
      ),
    );
  }
}
