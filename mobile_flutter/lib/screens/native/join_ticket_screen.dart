import 'dart:async';
import 'package:flutter/material.dart' hide ConnectionState;
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/connection_provider.dart';
import '../../services/webrtc_service.dart';
import '../chat/chat_screen.dart';

class JoinTicketScreen extends StatefulWidget {
  const JoinTicketScreen({super.key});

  @override
  State<JoinTicketScreen> createState() => _JoinTicketScreenState();
}

class _JoinTicketScreenState extends State<JoinTicketScreen> {
  final _offerController = TextEditingController();
  bool _processing = false;
  bool _answerReady = false;
  bool _copied = false;
  bool _navigated = false;
  StreamSubscription? _connectionSubscription;

  @override
  void initState() {
    super.initState();
    // Listen for actual DataChannel connection
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<ConnectionProvider>();
      _connectionSubscription =
          provider.webrtcService.onStateChange.listen((state) {
        if (state == ConnectionState.connected && _answerReady && !_navigated) {
          _navigated = true;
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const ChatScreen()),
            (route) => false,
          );
        }
      });
    });
  }

  @override
  void dispose() {
    _connectionSubscription?.cancel();
    _offerController.dispose();
    super.dispose();
  }

  Future<void> _processOffer() async {
    final offer = _offerController.text.trim();
    if (offer.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Tempel kode undangan dulu!'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    setState(() => _processing = true);

    try {
      final provider = context.read<ConnectionProvider>();
      await provider.startAsGuest(offer);

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

      setState(() {
        _processing = false;
        _answerReady = true;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
      setState(() => _processing = false);
    }
  }

  void _copyAnswer() {
    final provider = context.read<ConnectionProvider>();
    if (provider.localSdp != null) {
      Clipboard.setData(ClipboardData(text: provider.localSdp!));
      setState(() => _copied = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Tiket balasan disalin!'),
          backgroundColor: AppTheme.success,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ConnectionProvider>(
      builder: (context, provider, _) {
        // Note: Don't auto-navigate here. For Guest, connection happens
        // when Host processes the answer. The DataChannel open event
        // will trigger the state change, but we shouldn't navigate
        // until signaling is complete.

        return Scaffold(
          appBar: AppBar(
            title: Text(_answerReady ? 'Langkah 2/2' : 'Langkah 1/2'),
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
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: !_answerReady
                    ? _buildOfferInput()
                    : _buildAnswerDisplay(provider),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildOfferInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('📥', style: TextStyle(fontSize: 48)),
        const SizedBox(height: 16),
        Text(
          'Tempel Tiket Undangan',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Minta pengirim untuk membagikan tiket undangan',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppTheme.textSecondary,
              ),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _offerController,
          maxLines: 6,
          decoration: InputDecoration(
            hintText: 'Tempel tiket undangan di sini...',
            hintStyle: TextStyle(color: AppTheme.textMuted),
          ),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _processing ? null : _processOffer,
          child: _processing
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Proses Tiket'),
        ),
      ],
    );
  }

  Widget _buildAnswerDisplay(ConnectionProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.success.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Icon(Icons.check_circle, color: AppTheme.success),
              const SizedBox(width: 12),
              const Text(
                'Tiket Balasan Siap!',
                style: TextStyle(
                  color: AppTheme.success,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Text(
          '📤 Kirim Balasan ke Pengirim',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Salin kode ini & kirim ke pengirim',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppTheme.textSecondary,
              ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.surfaceLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.textMuted.withOpacity(0.2)),
          ),
          child: Column(
            children: [
              SizedBox(
                height: 100,
                child: SingleChildScrollView(
                  child: Text(
                    provider.localSdp ?? '',
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
                onPressed: _copyAnswer,
                icon: Icon(_copied ? Icons.check : Icons.copy),
                label: Text(_copied ? 'Tersalin!' : 'Salin Tiket Balasan'),
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      _copied ? AppTheme.success : AppTheme.primary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),

        // Waiting indicator
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppTheme.surfaceLight.withOpacity(0.5),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              const CircularProgressIndicator(
                color: AppTheme.primary,
                strokeWidth: 2,
              ),
              const SizedBox(height: 16),
              Text(
                'Menunggu pengirim...',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textSecondary,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'Koneksi akan otomatis terbuka setelah pengirim memproses tiket balasan',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppTheme.textMuted,
                    ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
