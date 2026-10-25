import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

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
              MarkerLayer(
                markers: [
                  Marker(
                    point: _disasterCenter,
                    width: 56,
                    height: 56,
                    child: const Icon(
                      Icons.warning_amber,
                      color: _disasterRed,
                      size: 48,
                    ),
                  ),
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
            bottom: 28,
            child: SafeArea(
              child: Card(
                elevation: 3,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 9,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.circle, color: _disasterRed, size: 13),
                      const SizedBox(width: 7),
                      const Text('Zona Merah · Radius 1,5 km'),
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
