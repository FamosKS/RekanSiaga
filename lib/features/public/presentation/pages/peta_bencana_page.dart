import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

class PetaBencanaPage extends StatefulWidget {
  const PetaBencanaPage({super.key, this.onEmergencyTap});

  final VoidCallback? onEmergencyTap;

  @override
  State<PetaBencanaPage> createState() => _PetaBencanaPageState();
}

class _PetaBencanaPageState extends State<PetaBencanaPage> {
  final MapController _mapController = MapController();
  LatLng? _userLocation;
  bool _isGettingLocation = false;
  bool _showVolunteers = false;
  bool _showPosts = false;
  String _selectedCategory = 'Semua';

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: const MapOptions(
              initialCenter: LatLng(-2.548926, 118.0148634),
              initialZoom: 14.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.rekansiaga',
              ),
              if (_userLocation case final location?)
                MarkerLayer(
                  markers: [
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
                              'Menunggu data kejadian publik resmi',
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
