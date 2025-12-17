import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/connection_provider.dart';
import '../chat/chat_screen.dart';

class HostTicketScreen extends StatefulWidget {
  const HostTicketScreen({super.key});

  @override
  State<HostTicketScreen> createState() => _HostTicketScreenState();
}

class _HostTicketScreenState extends State<HostTicketScreen> {
  final _answerController = TextEditingController();
  bool _copied = false;
  bool _processing = false;

  @override
  void dispose() {
    _answerController.dispose();
    super.dispose();
  }

  void _copyOffer() {
    final provider = context.read<ConnectionProvider>();
    if (provider.localSdp != null) {
      Clipboard.setData(ClipboardData(text: provider.localSdp!));
      setState(() => _copied = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Tiket berhasil disalin!'),
          backgroundColor: AppTheme.success,
        ),
      );
    }
  }

  Future<void> _processAnswer() async {
    final answer = _answerController.text.trim();
    if (answer.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Tempel kode balasan dulu!'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    setState(() => _processing = true);

    try {
      final provider = context.read<ConnectionProvider>();
      await provider.processAnswer(answer);

      if (provider.error != null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(provider.error!),
              backgroundColor: AppTheme.error,
            ),
          );
        }
        setState(() => _processing = false);
        return;
      }

      // Wait for connection
      await Future.delayed(const Duration(milliseconds: 500));

      if (mounted && provider.isConnected) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const ChatScreen()),
          (route) => false,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ConnectionProvider>(
      builder: (context, provider, _) {
        // Listen for connection state changes
        if (provider.isConnected) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => const ChatScreen()),
              (route) => false,
            );
          });
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('Langkah 1/2'),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () {
                provider.reset();
                Navigator.pop(context);
              },
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
              child: provider.localSdp == null
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          CircularProgressIndicator(color: AppTheme.primary),
                          SizedBox(height: 16),
                          Text('Membuat tiket undangan...'),
                        ],
                      ),
                    )
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Section 1: Offer Code
                          Text(
                            '📤 Tiket Undangan',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Salin & kirim ke teman (via WA/chat)',
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: AppTheme.textSecondary,
                                    ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.surfaceLight,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: AppTheme.textMuted.withOpacity(0.2),
                              ),
                            ),
                            child: Column(
                              children: [
                                SizedBox(
                                  height: 100,
                                  child: SingleChildScrollView(
                                    child: Text(
                                      provider.localSdp!,
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontFamily: 'monospace',
                                        color: AppTheme.textSecondary,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                ElevatedButton.icon(
                                  onPressed: _copyOffer,
                                  icon:
                                      Icon(_copied ? Icons.check : Icons.copy),
                                  label: Text(
                                      _copied ? 'Tersalin!' : 'Salin Tiket'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: _copied
                                        ? AppTheme.success
                                        : AppTheme.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 32),
                          const Divider(color: AppTheme.textMuted),
                          const SizedBox(height: 16),

                          // Section 2: Answer Input
                          Text(
                            '📥 Tiket Balasan',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Tempel kode balasan dari teman',
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: AppTheme.textSecondary,
                                    ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _answerController,
                            maxLines: 5,
                            decoration: InputDecoration(
                              hintText: 'Tempel tiket balasan di sini...',
                              hintStyle: TextStyle(color: AppTheme.textMuted),
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _processing ? null : _processAnswer,
                            child: _processing
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text('Proses Koneksi'),
                          ),

                          if (provider.error != null) ...[
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppTheme.error.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                provider.error!,
                                style: const TextStyle(color: AppTheme.error),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
            ),
          ),
        );
      },
    );
  }
}
