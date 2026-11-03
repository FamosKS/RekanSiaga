import 'dart:async';
import 'dart:math';

import 'package:battery_plus/battery_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

class SosPage extends StatefulWidget {
  const SosPage({super.key});

  @override
  State<SosPage> createState() => _SosPageState();
}

class _SosPageState extends State<SosPage> {
  static const _storage = FlutterSecureStorage();

  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emergencyContactController = TextEditingController();
  final _manualLocationController = TextEditingController();

  static const _defaultContacts = [
    _EmergencyContact(
      title: 'Call Center Darurat',
      number: '112',
      icon: Icons.emergency_rounded,
    ),
    _EmergencyContact(
      title: 'Basarnas (Pencarian & Pertolongan)',
      number: '115',
      icon: Icons.search_rounded,
    ),
    _EmergencyContact(
      title: 'Ambulans / Medis',
      number: '119',
      icon: Icons.medical_services_rounded,
    ),
    _EmergencyContact(
      title: 'Kepolisian',
      number: '110',
      icon: Icons.shield_rounded,
    ),
    _EmergencyContact(
      title: 'Pemadam Kebakaran',
      number: '113',
      icon: Icons.local_fire_department_outlined,
    ),
  ];

  late final Future<List<_EmergencyContact>> _contactsFuture =
      _loadEmergencyContacts();

  bool _isCapturing = false;
  bool _includeName = true;
  bool _includePhone = true;
  bool _includeEmergencyContact = true;
  Position? _position;
  String _locationPermission = 'BELUM DIMINTA';
  String _batteryStatus = 'NOT_AVAILABLE';
  String _networkStatus = 'UNKNOWN';

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emergencyContactController.dispose();
    _manualLocationController.dispose();
    super.dispose();
  }

  Future<void> _activateSos() async {
    if (_isCapturing) return;
    setState(() => _isCapturing = true);

    await _captureLocationPermission();
    await _captureDeviceStatus();
    if (!mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => _SosPreview(
          nameController: _nameController,
          phoneController: _phoneController,
          emergencyContactController: _emergencyContactController,
          manualLocationController: _manualLocationController,
          position: _position,
          locationPermission: _locationPermission,
          batteryStatus: _batteryStatus,
          networkStatus: _networkStatus,
          includeName: _includeName,
          includePhone: _includePhone,
          includeEmergencyContact: _includeEmergencyContact,
          onIncludeNameChanged: (value) {
            setSheetState(() => _includeName = value);
          },
          onIncludePhoneChanged: (value) {
            setSheetState(() => _includePhone = value);
          },
          onIncludeEmergencyContactChanged: (value) {
            setSheetState(() => _includeEmergencyContact = value);
          },
          onConfirm: _submitSos,
        ),
      ),
    );

    if (mounted) setState(() => _isCapturing = false);
  }

  Future<void> _captureLocationPermission() async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (!mounted) return;

      setState(() {
        _locationPermission = permission.name.toUpperCase();
      });

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return;
      }

      if (!await Geolocator.isLocationServiceEnabled()) {
        if (mounted) setState(() => _locationPermission = 'SERVICE_DISABLED');
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );
      if (mounted) setState(() => _position = position);
    } on TimeoutException {
      if (mounted) setState(() => _locationPermission = 'TIMED_OUT');
    } catch (_) {
      if (mounted) setState(() => _locationPermission = 'UNAVAILABLE');
    }
  }

  Future<void> _captureDeviceStatus() async {
    try {
      final batteryLevel = await Battery().batteryLevel;
      final state = await Battery().batteryState;
      if (mounted) {
        setState(() {
          _batteryStatus = '$batteryLevel% • ${state.name.toUpperCase()}';
        });
      }
    } catch (_) {
      if (mounted) setState(() => _batteryStatus = 'NOT_SUPPORTED');
    }

    try {
      final results = await Connectivity().checkConnectivity();
      final types = results.map((item) => item.name).join(', ');
      if (mounted) {
        setState(() => _networkStatus = types.isEmpty ? 'NONE' : types);
      }
    } catch (_) {
      if (mounted) setState(() => _networkStatus = 'UNKNOWN');
    }
  }

  Future<List<_EmergencyContact>> _loadEmergencyContacts() async {
    final client = Supabase.instance.client;
    for (final table in const ['emergency_contacts', 'contacts']) {
      try {
        final data = await client.from(table).select();
        final contacts = _parseContacts(data);
        if (contacts.isNotEmpty) return contacts;
      } catch (e) {
        // ignore: avoid_print
        print('DEBUG EMERGENCY CONTACTS ERROR: $e');
      }
    }
    return _defaultContacts;
  }

  List<_EmergencyContact> _parseContacts(List<dynamic> data) {
    final contacts = <_EmergencyContact>[];
    for (final item in data) {
      if (item is! Map) continue;
      final map = Map<String, dynamic>.from(item);
      final name = _firstText(map, const [
        'name',
        'title',
        'service_name',
        'organization',
        'agency',
      ]);
      final number = _firstText(map, const [
        'phone_number',
        'phone',
        'number',
        'tel',
        'contact_number',
      ]);
      if (name == null || number == null) continue;
      contacts.add(
        _EmergencyContact(
          title: name,
          number: number,
          icon: Icons.phone_in_talk_rounded,
        ),
      );
    }
    return contacts;
  }

  String? _firstText(Map<String, dynamic> map, List<String> keys) {
    for (final key in keys) {
      final value = map[key]?.toString().trim();
      if (value != null && value.isNotEmpty) return value;
    }
    return null;
  }

  Future<void> _submitSos() async {
    final draft = <String, String>{
      'captured_at': DateTime.now().toUtc().toIso8601String(),
      'location_permission': _locationPermission,
      'network_status': _networkStatus,
      'battery_status': _batteryStatus,
      if (_position != null) ...{
        'latitude': _position!.latitude.toString(),
        'longitude': _position!.longitude.toString(),
        'accuracy_m': _position!.accuracy.toString(),
        'location_timestamp': _position!.timestamp.toIso8601String(),
      },
      if (_includeName) 'name': _nameController.text.trim(),
      if (_includePhone) 'phone': _phoneController.text.trim(),
      if (_includeEmergencyContact)
        'emergency_contact': _emergencyContactController.text.trim(),
      if (_manualLocationController.text.trim().isNotEmpty)
        'manual_location': _manualLocationController.text.trim(),
    };

    final existingIdempotencyKey = await _storage.read(
      key: 'rekansiaga_sos_latest_idempotency',
    );
    final idempotencyKey = existingIdempotencyKey ?? _createIdempotencyKey();
    await _storage.write(
      key: 'rekansiaga_sos_latest_idempotency',
      value: idempotencyKey,
    );
    await _storage.write(
      key: 'rekansiaga_sos_pending_draft',
      value: draft.entries
          .map((entry) => '${entry.key}=${entry.value}')
          .join('\n'),
    );

    if (!mounted) return;
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text(
            'Permintaan belum dikirim: backend SOS dan kontrak RPC belum tersedia. Draft sensitif disimpan terenkripsi pada perangkat.',
          ),
          duration: Duration(seconds: 7),
        ),
      );
  }

  String _createIdempotencyKey() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    final hex = bytes.map((value) => value.toRadixString(16).padLeft(2, '0'));
    return hex.join();
  }

  Future<void> _callOfficialChannel(_EmergencyContact contact) async {
    final uri = Uri(scheme: 'tel', path: contact.number);
    if (!await launchUrl(uri)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Aplikasi telepon tidak tersedia.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E293B),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Pusat Darurat',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontWeight: FontWeight.w700,
          ),
        ),
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: const Icon(Icons.arrow_back_ios_new),
          color: const Color(0xFF1E293B),
          tooltip: 'Kembali',
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF4E5),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFED7AA)),
              ),
              child: const Text(
                'RekanSiaga belum terhubung ke pusat komando atau layanan penyelamatan resmi. Pengiriman digital belum tersedia sampai backend SOS disetujui dan dideploy.',
                style: TextStyle(
                  color: Color(0xFF7C2D12),
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Center(
              child: Semantics(
                button: true,
                label: 'Aktivasi permintaan SOS',
                child: GestureDetector(
                  onTap: _activateSos,
                  child: Container(
                    width: 180,
                    height: 180,
                    decoration: BoxDecoration(
                      color: const Color(0xFFDC2626),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 8),
                      boxShadow: const [
                        BoxShadow(color: Color(0x33DC2626), blurRadius: 20),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'SOS',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 42,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          _isCapturing ? 'MEMERIKSA...' : 'AKTIVASI',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            letterSpacing: 1.4,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Aktivasi akan meminta izin dan menampilkan ringkasan data sebelum ada tindakan pengiriman.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 24),
            Text(
              'Jalur layanan resmi',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Nomor umum ini dipisahkan dari pengiriman RekanSiaga. Memanggil memerlukan tindakan pengguna.',
              style: const TextStyle(fontSize: 14, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 10),
            FutureBuilder<List<_EmergencyContact>>(
              future: _contactsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(color: Color(0xFFF57C00)),
                  );
                }

                final contacts = snapshot.data ?? _defaultContacts;
                return Column(
                  children: [
                    for (final contact in contacts)
                      Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        color: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFF3E8),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(
                                  contact.icon,
                                  color: const Color(0xFFD35400),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      contact.title,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      contact.number,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFF212121),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              FilledButton.icon(
                                onPressed: () => _callOfficialChannel(contact),
                                icon: const Icon(Icons.phone, size: 18),
                                style: FilledButton.styleFrom(
                                  backgroundColor: const Color(0xFFF57C00),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 12,
                                  ),
                                ),
                                label: const Text('Panggil Sekarang'),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _SosPreview extends StatelessWidget {
  const _SosPreview({
    required this.nameController,
    required this.phoneController,
    required this.emergencyContactController,
    required this.manualLocationController,
    required this.position,
    required this.locationPermission,
    required this.batteryStatus,
    required this.networkStatus,
    required this.includeName,
    required this.includePhone,
    required this.includeEmergencyContact,
    required this.onIncludeNameChanged,
    required this.onIncludePhoneChanged,
    required this.onIncludeEmergencyContactChanged,
    required this.onConfirm,
  });

  final TextEditingController nameController;
  final TextEditingController phoneController;
  final TextEditingController emergencyContactController;
  final TextEditingController manualLocationController;
  final Position? position;
  final String locationPermission;
  final String batteryStatus;
  final String networkStatus;
  final bool includeName;
  final bool includePhone;
  final bool includeEmergencyContact;
  final ValueChanged<bool> onIncludeNameChanged;
  final ValueChanged<bool> onIncludePhoneChanged;
  final ValueChanged<bool> onIncludeEmergencyContactChanged;
  final Future<void> Function() onConfirm;

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: padding),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Pratinjau data SOS',
                style: Theme.of(context).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              const Text(
                'Tidak ada data yang dikirim saat ini. Konfirmasi hanya menyimpan draft terenkripsi dan membuat idempotency key lokal.',
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Sertakan nama'),
                value: includeName,
                onChanged: onIncludeNameChanged,
              ),
              TextField(
                controller: nameController,
                enabled: includeName,
                decoration: const InputDecoration(labelText: 'Nama'),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Sertakan nomor telepon'),
                value: includePhone,
                onChanged: onIncludePhoneChanged,
              ),
              TextField(
                controller: phoneController,
                enabled: includePhone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Nomor telepon'),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Sertakan kontak darurat'),
                value: includeEmergencyContact,
                onChanged: onIncludeEmergencyContactChanged,
              ),
              TextField(
                controller: emergencyContactController,
                enabled: includeEmergencyContact,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Kontak darurat'),
              ),
              const SizedBox(height: 16),
              _SnapshotRow(
                label: 'Lokasi GPS',
                value: position == null
                    ? 'UNAVAILABLE ($locationPermission)'
                    : '${position!.latitude.toStringAsFixed(6)}, '
                          '${position!.longitude.toStringAsFixed(6)}',
              ),
              _SnapshotRow(
                label: 'Akurasi',
                value: position == null
                    ? 'UNAVAILABLE'
                    : '${position!.accuracy.toStringAsFixed(1)} m',
              ),
              _SnapshotRow(label: 'Baterai', value: batteryStatus),
              _SnapshotRow(label: 'Koneksi lokal', value: networkStatus),
              const SizedBox(height: 10),
              TextField(
                controller: manualLocationController,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Lokasi manual (opsional)',
                  hintText: 'Nama jalan, desa, kecamatan, atau patokan',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: onConfirm,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFFD34B3B),
                    minimumSize: const Size.fromHeight(48),
                  ),
                  child: const Text('Konfirmasi & simpan draft'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SnapshotRow extends StatelessWidget {
  const _SnapshotRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _EmergencyContact {
  const _EmergencyContact({
    required this.title,
    required this.number,
    required this.icon,
  });

  final String title;
  final String number;
  final IconData icon;
}
