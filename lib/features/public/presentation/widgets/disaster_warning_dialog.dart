import 'package:flutter/material.dart';

Future<void> showDisasterWarningDialog(
  BuildContext context, {
  DisasterWarning? warning,
}) {
  return showDialog<void>(
    context: context,
    builder: (context) => DisasterWarningDialog(warning: warning),
  );
}

class DisasterWarning {
  const DisasterWarning({
    required this.id,
    required this.version,
    required this.title,
    required this.description,
    required this.location,
    required this.occurredAt,
    required this.source,
    required this.updatedAt,
    required this.status,
    this.expectedArrival,
    this.condition,
    this.safetyAction,
    this.evacuations = const [],
  });

  final String id;
  final int version;
  final String title;
  final String description;
  final String location;
  final DateTime occurredAt;
  final String source;
  final DateTime updatedAt;
  final String status;
  final String? expectedArrival;
  final String? condition;
  final String? safetyAction;
  final List<EvacuationReference> evacuations;
}

class EvacuationReference {
  const EvacuationReference({required this.label, required this.note});

  final String label;
  final String note;
}

class DisasterWarningDialog extends StatelessWidget {
  const DisasterWarningDialog({super.key, this.warning});

  final DisasterWarning? warning;

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
                    onPressed: () => Navigator.of(context).pop(),
                    tooltip: 'Tutup',
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                warning?.title ?? 'Informasi peringatan belum tersedia',
                style: const TextStyle(
                  color: Color(0xFF172033),
                  fontSize: 21,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                warning?.description ?? 'Belum ada peringatan aktif yang dapat diverifikasi dari sumber publik.',
                style: const TextStyle(color: _mutedText, height: 1.45),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 14),
                child: Divider(height: 1),
              ),
              _buildInfoRow(
                Icons.location_on,
                warning == null
                    ? 'Lokasi: belum tersedia'
                    : 'Lokasi: ${warning!.location}',
              ),
              const SizedBox(height: 12),
              _buildInfoRow(
                Icons.access_time,
                warning?.expectedArrival == null
                    ? 'Estimasi kedatangan: belum ada estimasi resmi'
                    : 'Estimasi kedatangan: ${warning!.expectedArrival}',
              ),
              const SizedBox(height: 12),
              _buildInfoRow(
                Icons.warning_amber,
                warning?.condition == null
                    ? 'Kondisi: belum tersedia'
                    : 'Kondisi: ${warning!.condition}',
              ),
              const SizedBox(height: 12),
              _buildInfoRow(
                Icons.update,
                warning == null
                    ? 'Terakhir diperbarui: belum tersedia'
                    : 'Terakhir diperbarui: ${_formatDateTime(warning!.updatedAt)}',
              ),
              if (warning?.safetyAction case final action?) ...[
                const SizedBox(height: 18),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF1E2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.shield_outlined, color: _orange, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Tindakan Keselamatan',
                            style: TextStyle(
                              color: _orange,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        action,
                        style: const TextStyle(color: _mutedText, height: 1.4),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 18),
              if (warning == null || warning!.evacuations.isEmpty)
                _buildInfoRow(
                  Icons.follow_the_signs_outlined,
                  'Rute evakuasi belum terverifikasi. Ikuti arahan petugas dan informasi resmi setempat.',
                )
              else
                _buildEvacuations(warning!.evacuations),
              const SizedBox(height: 18),
              _buildInfoRow(
                Icons.campaign_outlined,
                warning == null
                    ? 'Sumber informasi: belum tersedia'
                    : 'Sumber: ${warning!.source} • Status: ${warning!.status}',
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

  static Widget _buildEvacuations(List<EvacuationReference> evacuations) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.follow_the_signs_outlined, color: _orange, size: 20),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Referensi Evakuasi Terverifikasi',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        for (final evacuation in evacuations)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text(
              '${evacuation.label}: ${evacuation.note}',
              style: const TextStyle(color: _mutedText, height: 1.4),
            ),
          ),
      ],
    );
  }

  static String _formatDateTime(DateTime value) {
    final local = value.toLocal();
    return '${local.day.toString().padLeft(2, '0')}/'
        '${local.month.toString().padLeft(2, '0')}/'
        '${local.year} ${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')}';
  }
}
