import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../config/theme.dart';
import '../../providers/connection_provider.dart';
import '../../providers/chat_provider.dart';
import '../../widgets/message_bubble.dart';
import '../../widgets/stats_panel.dart';
import '../home_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  bool _showStats = false;

  @override
  void initState() {
    super.initState();
    // Initialize chat provider with WebRTC service
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final connProvider = context.read<ConnectionProvider>();
      final chatProvider = context.read<ChatProvider>();
      chatProvider.init(connProvider.webrtcService);
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    }
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    context.read<ChatProvider>().sendMessage(text);
    _messageController.clear();

    Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);
  }

  Future<void> _pickAndSendFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: false,
        withData: kIsWeb, // Load bytes on web
      );

      if (result != null && result.files.isNotEmpty) {
        final pickedFile = result.files.first;

        if (kIsWeb) {
          // Web: use bytes
          if (pickedFile.bytes != null) {
            context.read<ChatProvider>().sendFileFromBytes(
                  pickedFile.bytes!,
                  pickedFile.name,
                );
            Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);
          } else {
            throw Exception('Tidak dapat membaca file');
          }
        } else {
          // Mobile/Desktop: use path
          final path = pickedFile.path;
          if (path != null) {
            final file = File(path);
            context.read<ChatProvider>().sendFile(file);
            Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);
          }
        }
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
    }
  }

  void _exitRoom() {
    // Capture the parent context before showing dialog
    final parentContext = context;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Keluar Room?'),
        content: const Text('Koneksi akan terputus.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () async {
              // Close dialog first
              Navigator.pop(dialogContext);

              // Reset providers using parent context
              await parentContext.read<ConnectionProvider>().reset();
              parentContext.read<ChatProvider>().clear();

              // Navigate to home screen - pushAndRemoveUntil ensures clean navigation
              if (parentContext.mounted) {
                Navigator.of(parentContext).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const HomeScreen()),
                  (route) => false,
                );
              }
            },
            child:
                const Text('Keluar', style: TextStyle(color: AppTheme.error)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: const BoxDecoration(
                color: AppTheme.success,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            const Text('Terhubung'),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(_showStats ? Icons.bar_chart : Icons.bar_chart_outlined),
            onPressed: () => setState(() => _showStats = !_showStats),
            tooltip: 'Statistik',
          ),
          IconButton(
            icon: const Icon(Icons.exit_to_app),
            onPressed: _exitRoom,
            tooltip: 'Keluar',
          ),
        ],
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
          child: Column(
            children: [
              // Stats Panel (collapsible)
              if (_showStats) const StatsPanel(),

              // Messages
              Expanded(
                child: Consumer<ChatProvider>(
                  builder: (context, chatProvider, _) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      _scrollToBottom();
                    });

                    return ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: chatProvider.messages.length,
                      itemBuilder: (context, index) {
                        final message = chatProvider.messages[index];
                        return MessageBubble(message: message);
                      },
                    );
                  },
                ),
              ),

              // Input Area
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  border: Border(
                    top: BorderSide(color: AppTheme.textMuted.withOpacity(0.1)),
                  ),
                ),
                child: Row(
                  children: [
                    // File Attachment
                    IconButton(
                      onPressed: _pickAndSendFile,
                      icon: const Icon(Icons.attach_file),
                      color: AppTheme.textSecondary,
                    ),
                    // Text Input
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        decoration: InputDecoration(
                          hintText: 'Tulis pesan...',
                          hintStyle: TextStyle(color: AppTheme.textMuted),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide.none,
                          ),
                          filled: true,
                          fillColor: AppTheme.surfaceLight,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 10,
                          ),
                        ),
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Send Button
                    Container(
                      decoration: const BoxDecoration(
                        color: AppTheme.primary,
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        onPressed: _sendMessage,
                        icon: const Icon(Icons.send),
                        color: AppTheme.background,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
