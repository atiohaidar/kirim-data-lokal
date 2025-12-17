import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum SaveLocation {
  internal, // App's internal storage
  downloads, // Downloads folder (public)
  custom, // Custom folder
}

class SettingsProvider extends ChangeNotifier {
  // SharedPreferences keys
  static const String _keySaveLocation = 'save_location';
  static const String _keyCustomPath = 'custom_path';
  static const String _keyAutoOpenFiles = 'auto_open_files';
  static const String _keyShowNotifications = 'show_notifications';

  SaveLocation _saveLocation = SaveLocation.internal;
  String? _customPath;
  bool _autoOpenFiles = false;
  bool _showNotifications = true;
  bool _isLoaded = false;

  // Storage info
  int _savedFilesCount = 0;
  int _totalStorageUsed = 0;
  String? _currentSavePath;

  SaveLocation get saveLocation => _saveLocation;
  String? get customPath => _customPath;
  bool get autoOpenFiles => _autoOpenFiles;
  bool get showNotifications => _showNotifications;
  int get savedFilesCount => _savedFilesCount;
  int get totalStorageUsed => _totalStorageUsed;
  String? get currentSavePath => _currentSavePath;
  bool get isLoaded => _isLoaded;

  SettingsProvider() {
    _initSettings();
  }

  Future<void> _initSettings() async {
    await _loadSettings();
    await _updateCurrentSavePath();
    await _calculateStorageUsage();
    _isLoaded = true;
    notifyListeners();
  }

  /// Load settings from SharedPreferences
  Future<void> _loadSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Load save location
      final locationIndex = prefs.getInt(_keySaveLocation);
      if (locationIndex != null && locationIndex < SaveLocation.values.length) {
        _saveLocation = SaveLocation.values[locationIndex];
      }

      // Load custom path
      _customPath = prefs.getString(_keyCustomPath);

      // Load auto open files
      _autoOpenFiles = prefs.getBool(_keyAutoOpenFiles) ?? false;

      // Load show notifications
      _showNotifications = prefs.getBool(_keyShowNotifications) ?? true;

      debugPrint(
          'Settings loaded: location=${_saveLocation.name}, autoOpen=$_autoOpenFiles, notifications=$_showNotifications');
    } catch (e) {
      debugPrint('Error loading settings: $e');
    }
  }

  /// Save all settings to SharedPreferences
  Future<void> _saveSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      await prefs.setInt(_keySaveLocation, _saveLocation.index);
      if (_customPath != null) {
        await prefs.setString(_keyCustomPath, _customPath!);
      }
      await prefs.setBool(_keyAutoOpenFiles, _autoOpenFiles);
      await prefs.setBool(_keyShowNotifications, _showNotifications);

      debugPrint('Settings saved successfully');
    } catch (e) {
      debugPrint('Error saving settings: $e');
    }
  }

  Future<void> _updateCurrentSavePath() async {
    if (kIsWeb) {
      _currentSavePath = 'Browser Downloads';
      notifyListeners();
      return;
    }

    try {
      switch (_saveLocation) {
        case SaveLocation.internal:
          final dir = await getApplicationDocumentsDirectory();
          _currentSavePath = '${dir.path}/KirimData';
          break;
        case SaveLocation.downloads:
          if (Platform.isAndroid) {
            _currentSavePath = '/storage/emulated/0/Download/KirimData';
          } else if (Platform.isIOS) {
            final dir = await getApplicationDocumentsDirectory();
            _currentSavePath = '${dir.path}/KirimData';
          } else {
            final dir = await getDownloadsDirectory();
            _currentSavePath = '${dir?.path ?? ''}/KirimData';
          }
          break;
        case SaveLocation.custom:
          _currentSavePath = _customPath ?? '';
          break;
      }

      // Ensure directory exists
      if (_currentSavePath != null && _currentSavePath!.isNotEmpty) {
        await Directory(_currentSavePath!).create(recursive: true);
      }
    } catch (e) {
      debugPrint('Error setting save path: $e');
      // Fallback to internal
      final dir = await getApplicationDocumentsDirectory();
      _currentSavePath = '${dir.path}/KirimData';
      await Directory(_currentSavePath!).create(recursive: true);
    }

    notifyListeners();
  }

  Future<void> _calculateStorageUsage() async {
    if (kIsWeb || _currentSavePath == null) return;

    try {
      final dir = Directory(_currentSavePath!);
      if (await dir.exists()) {
        int count = 0;
        int size = 0;

        await for (final entity in dir.list(recursive: true)) {
          if (entity is File) {
            count++;
            size += await entity.length();
          }
        }

        _savedFilesCount = count;
        _totalStorageUsed = size;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error calculating storage: $e');
    }
  }

  Future<void> setSaveLocation(SaveLocation location) async {
    _saveLocation = location;
    await _saveSettings();
    await _updateCurrentSavePath();
    await _calculateStorageUsage();
    notifyListeners();
  }

  Future<void> setCustomPath(String path) async {
    _customPath = path;
    await _saveSettings();
    if (_saveLocation == SaveLocation.custom) {
      await _updateCurrentSavePath();
      await _calculateStorageUsage();
    }
    notifyListeners();
  }

  Future<void> setAutoOpenFiles(bool value) async {
    _autoOpenFiles = value;
    await _saveSettings();
    notifyListeners();
  }

  Future<void> setShowNotifications(bool value) async {
    _showNotifications = value;
    await _saveSettings();
    notifyListeners();
  }

  Future<void> clearCache() async {
    if (kIsWeb || _currentSavePath == null) return;

    try {
      final dir = Directory(_currentSavePath!);
      if (await dir.exists()) {
        await for (final entity in dir.list()) {
          await entity.delete(recursive: true);
        }
      }
      _savedFilesCount = 0;
      _totalStorageUsed = 0;
      notifyListeners();
    } catch (e) {
      debugPrint('Error clearing cache: $e');
    }
  }

  Future<void> refreshStorageInfo() async {
    await _calculateStorageUsage();
  }

  String formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }
}
