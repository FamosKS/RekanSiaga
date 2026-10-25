import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

Future<void> showDisasterWarningDialog(BuildContext context) {
  return showDialog<void>(
    context: context,
    builder: (context) => const DisasterWarningDialog(),
  );
}

class DisasterWarningDialog extends StatelessWidget {
  const DisasterWarningDialog({super.key});

  static const _orange = Color(0xFFE87500);
  static const _mutedText = Color(0xFF68707D);

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 480),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFCE8E6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'PERINGATAN BENCANA',
                      style: TextStyle(
                        color: Color(0xFFC62828),
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => context.pop(),
                    tooltip: 'Tutup',
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Peringatan Bencana Banjir Bandang',
                style: TextStyle(
                  color: Color(0xFF172033),
                  fontSize: 21,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Banjir bandang diperkirakan tiba dalam 18 menit. Segera lakukan mitigasi dan evakuasi ke tempat yang lebih tinggi.',
                style: TextStyle(color: _mutedText, height: 1.45),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 14),
                child: Divider(height: 1),
              ),
              _buildInfoRow(
                Icons.location_on,
                'Lokasi: Kecamatan Koto Tangah, Kota Padang',
              ),
              const SizedBox(height: 12),
              _buildInfoRow(
                Icons.access_time,
                'Perkiraan tiba: 18 menit (pukul 14:42 WIB)',
              ),
              const SizedBox(height: 12),
              _buildInfoRow(
                Icons.warning_amber,
                'Kondisi: Curah hujan tinggi, debit air naik cepat',
              ),
              const SizedBox(height: 18),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF1E2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.map_outlined, color: _orange, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Rute Evakuasi',
                          style: TextStyle(
                            color: _orange,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Gunakan rute evakuasi menuju titik kumpul di Masjid Al-Hidayah atau Puskesmas Cisarua.',
                      style: TextStyle(color: _mutedText, height: 1.4),
                    ),
                    SizedBox(height: 10),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.arrow_forward, color: _orange, size: 18),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Ambil Jl. Raya Puncak -> belok kiri ke Jl. Siliwangi -> lanjutkan ke arah Masjid Al-Hidayah',
                            style: TextStyle(
                              color: Color(0xFF424955),
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
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

  static Widget _buildInfoRow(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: _orange, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(color: _mutedText, height: 1.4),
          ),
        ),
      ],
    );
  }
}
