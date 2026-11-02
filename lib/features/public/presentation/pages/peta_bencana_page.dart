import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PetaBencanaPage extends StatefulWidget {
  const PetaBencanaPage({super.key, this.onEmergencyTap});

  final VoidCallback? onEmergencyTap;

  @override
  State<PetaBencanaPage> createState() => _PetaBencanaPageState();
}

class _PetaBencanaPageState extends State<PetaBencanaPage> {
  static const _disasterCenter = LatLng(-0.8198, 100.3204);
  static const _disasterRed = Color(0xFFC62828);

  final MapController _mapController = MapController();
  LatLng? _userLocation;
  bool _isGettingLocation = false;
  bool _showVolunteers = false;
  bool _showPosts = false;
  String _selectedCategory = 'Semua';

  Stream<List<Map<String, dynamic>>> get _reportsStream => Supabase
      .instance
      .client
      .from('public_reports')
      .stream(primaryKey: ['id']);

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _moveToCurrentLocation() async {
    if (_isGettingLocation) return;

    setState(() {
      _isGettingLocation = true;
    });

    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _showLocationMessage(
          'Aktifkan layanan lokasi untuk menemukan posisi Anda.',
        );
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _showLocationMessage(
          'Izin lokasi diperlukan untuk menemukan posisi Anda.',
        );
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      if (!mounted) return;

      final location = LatLng(position.latitude, position.longitude);
      setState(() {
        _userLocation = location;
      });
      _mapController.move(location, 15);
    } on LocationServiceDisabledException {
      _showLocationMessage(
        'Aktifkan layanan lokasi untuk menemukan posisi Anda.',
      );
    } on PermissionDeniedException {
      _showLocationMessage(
        'Izin lokasi diperlukan untuk menemukan posisi Anda.',
      );
    } on PlatformException catch (error, stackTrace) {
      debugPrint('Unable to get current location: $error\n$stackTrace');
      _showLocationMessage('Lokasi Anda tidak dapat diambil saat ini.');
    } on MissingPluginException catch (error, stackTrace) {
      debugPrint('Location plugin is unavailable: $error\n$stackTrace');
      _showLocationMessage('Fitur lokasi tidak tersedia pada perangkat ini.');
    } finally {
      if (mounted) {
        setState(() {
          _isGettingLocation = false;
        });
      }
    }
  }

  void _showLocationMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  List<Marker> _buildReportMarkers(List<Map<String, dynamic>> reports) {
    final markers = <Marker>[];
    for (final report in reports) {
      final status = report['status']?.toString();
      if (status != 'unverified' &&
          status != 'under_review' &&
          status != 'verified') {
        continue;
      }

      final type = _reportType(report);
      if (_selectedCategory != 'Semua' &&
          !_categoryMatches(type, _selectedCategory)) {
        continue;
      }

      final location = _reportLocation(report);
      if (location == null) continue;
      final icon = _disasterIcon(type);

      markers.add(
        Marker(
          point: location,
          width: 40,
          height: 40,
          alignment: Alignment.topCenter,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
              boxShadow: const [
                BoxShadow(color: Colors.black26, blurRadius: 5),
              ],
            ),
            child: type.toLowerCase().contains('gempa')
                ? SvgPicture.asset(
                    'assets/icons/material-symbols--earthquake 2.svg',
                    width: 20,
                    height: 20,
                  )
                : Icon(icon.$1, color: icon.$2, size: 24),
          ),
        ),
      );
    }
    return markers;
  }

  String _reportType(Map<String, dynamic> report) {
    return (report['jenis_laporan'] ?? report['report_type'] ?? '').toString();
  }

  LatLng? _reportLocation(Map<String, dynamic> report) {
    final latitude = _toDouble(report['latitude']);
    final longitude = _toDouble(report['longitude']);
    if (latitude != null && longitude != null) {
      return LatLng(latitude, longitude);
    }

    final coordinates = report['coordinates'];
    if (coordinates is String) {
      final match = RegExp(
        r'POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)',
        caseSensitive: false,
      ).firstMatch(coordinates);
      if (match != null) {
        return LatLng(
          double.parse(match.group(2)!),
          double.parse(match.group(1)!),
        );
      }
    }

    if (coordinates is Map<String, dynamic> &&
        coordinates['coordinates'] is List) {
      final values = coordinates['coordinates'] as List;
      if (values.length >= 2) {
        final lng = _toDouble(values[0]);
        final lat = _toDouble(values[1]);
        if (lng != null && lat != null) return LatLng(lat, lng);
      }
    }
    return _disasterCenter;
  }

  double? _toDouble(Object? value) {
    if (value is num) return value.toDouble();
    return value == null ? null : double.tryParse(value.toString());
  }

  bool _categoryMatches(String type, String category) {
    final normalizedType = type.toLowerCase();
    final normalizedCategory = category.toLowerCase();
    if (normalizedCategory == 'gunung berapi') {
      return normalizedType.contains('gunung');
    }
    if (normalizedCategory == 'api') {
      return normalizedType.contains('api') ||
          normalizedType.contains('kebakaran');
    }
    return normalizedType.contains(normalizedCategory);
  }

  Widget? _categoryIcon(String category) {
    final selected = category == _selectedCategory;
    final color = selected ? Colors.white : const Color(0xFF64748B);
    return switch (category) {
      'Gunung Berapi' => Icon(Icons.volcano_outlined, size: 18, color: color),
      'Banjir' => Icon(Icons.flood_outlined, size: 18, color: color),
      'Api' => Icon(
        Icons.local_fire_department_outlined,
        size: 18,
        color: color,
      ),
      'Gempa' => SvgPicture.asset(
        'assets/icons/material-symbols--earthquake 2.svg',
        width: 18,
        height: 18,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      ),
      'Tsunami' => Icon(Icons.waves_outlined, size: 18, color: color),
      _ => null,
    };
  }

  (IconData, Color, Color) _disasterIcon(String type) {
    final normalized = type.toLowerCase();
    if (normalized.contains('gunung')) {
      return (
        Icons.volcano_rounded,
        const Color(0xFFB45309),
        const Color(0xFFFFF7ED),
      );
    }
    if (normalized.contains('banjir')) {
      return (
        Icons.flood_rounded,
        const Color(0xFF15803D),
        const Color(0xFFECFDF5),
      );
    }
    if (normalized.contains('kebakaran') || normalized == 'api') {
      return (
        Icons.local_fire_department_rounded,
        const Color(0xFFB91C1C),
        const Color(0xFFFFF1F2),
      );
    }
    if (normalized.contains('tsunami')) {
      return (
        Icons.waves_rounded,
        const Color(0xFF0284C7),
        const Color(0xFFE0F2FE),
      );
    }
    if (normalized.contains('angin') || normalized.contains('puting')) {
      return (
        Icons.thunderstorm_rounded,
        const Color(0xFF475569),
        const Color(0xFFF1F5F9),
      );
    }
    if (normalized.contains('gempa')) {
      return (
        Icons.vibration_rounded,
        const Color(0xFFC05621),
        const Color(0xFFFFF7ED),
      );
    }
    return (Icons.warning_amber_rounded, _disasterRed, const Color(0xFFFFF1F2));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: const MapOptions(
              initialCenter: _disasterCenter,
              initialZoom: 14.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.rekansiaga',
              ),
              CircleLayer(
                circles: [
                  CircleMarker(
                    point: _disasterCenter,
                    radius: 1500,
                    useRadiusInMeter: true,
                    color: _disasterRed.withValues(alpha: 0.3),
                    borderColor: _disasterRed,
                    borderStrokeWidth: 2,
                  ),
                ],
              ),
              StreamBuilder<List<Map<String, dynamic>>>(
                stream: _reportsStream,
                builder: (context, snapshot) {
                  final reportMarkers = _buildReportMarkers(
                    snapshot.data ?? const [],
                  );
                  return MarkerLayer(
                    markers: [
                      ...reportMarkers,
                      if (_userLocation case final location?)
                        Marker(
                          point: location,
                          width: 24,
                          height: 24,
                          key: const ValueKey('user-location-marker'),
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.blue,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 3),
                              boxShadow: const [
                                BoxShadow(color: Colors.black26, blurRadius: 5),
                              ],
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
              RichAttributionWidget(
                attributions: [
                  TextSourceAttribution('OpenStreetMap contributors'),
                ],
              ),
            ],
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Card(
                      elevation: 3,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 11,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'Peta Bencana',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              'Zona Merah · Koto Tangah, Padang',
                              style: TextStyle(
                                color: Colors.blueGrey[700],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  if (widget.onEmergencyTap != null) ...[
                    const SizedBox(width: 8),
                    FloatingActionButton.small(
                      heroTag: 'map-emergency',
                      backgroundColor: const Color(0xFFD34B3B),
                      foregroundColor: Colors.white,
                      tooltip: 'Buka SOS',
                      onPressed: widget.onEmergencyTap,
                      child: const Icon(Icons.notifications_active_outlined),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 28,
            child: SafeArea(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x14000000),
                      blurRadius: 8,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        height: 36,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            for (final category in const [
                              'Semua',
                              'Gunung Berapi',
                              'Banjir',
                              'Api',
                              'Gempa',
                              'Tsunami',
                            ])
                              Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ChoiceChip(
                                  label: Text(category),
                                  selected: _selectedCategory == category,
                                  selectedColor: const Color(0xFFC05621),
                                  backgroundColor: Colors.white,
                                  avatar: _categoryIcon(category),
                                  labelStyle: TextStyle(
                                    color: _selectedCategory == category
                                        ? Colors.white
                                        : const Color(0xFF475569),
                                  ),
                                  onSelected: (_) {
                                    setState(() {
                                      _selectedCategory = category;
                                    });
                                  },
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Lapisan Peta',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ),
                      SwitchListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        secondary: const Icon(
                          Icons.groups_outlined,
                          color: Color(0xFF64748B),
                        ),
                        title: const Text(
                          'Tampilkan Relawan',
                          style: TextStyle(color: Color(0xFF1E293B)),
                        ),
                        value: _showVolunteers,
                        activeThumbColor: const Color(0xFFC05621),
                        onChanged: (value) {
                          setState(() => _showVolunteers = value);
                        },
                      ),
                      SwitchListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        secondary: const Icon(
                          Icons.home_work_outlined,
                          color: Color(0xFF64748B),
                        ),
                        title: const Text(
                          'Tampilkan Posko',
                          style: TextStyle(color: Color(0xFF1E293B)),
                        ),
                        value: _showPosts,
                        activeThumbColor: const Color(0xFFC05621),
                        onChanged: (value) {
                          setState(() => _showPosts = value);
                        },
                      ),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFC05621),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: _moveToCurrentLocation,
                          icon: const Icon(Icons.warning_amber_rounded),
                          label: const Text('Cek Risiko Lokasi Saya'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _isGettingLocation ? null : _moveToCurrentLocation,
        tooltip: 'Lokasi saya',
        child: _isGettingLocation
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : const Icon(Icons.my_location),
      ),
    );
  }
}
