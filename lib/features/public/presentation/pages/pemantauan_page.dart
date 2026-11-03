import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'panduan_siaga_page.dart';
import 'peta_bencana_page.dart';

class PemantauanPage extends StatelessWidget {
  const PemantauanPage({super.key, this.onOpenMap});

  final VoidCallback? onOpenMap;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GestureDetector(
                    onTap: () => context.pop(),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(11),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.arrow_back_ios_new,
                        size: 18,
                        color: Color(0xFF172033),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pemantauan Terkini',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        SizedBox(height: 5),
                        Text(
                          'Status bencana, kategori risiko, dan akses mitigasi untuk wilayah Anda.',
                          style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF64748B),
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _RiskStatusCard(
                status: 'Awas',
                subtitle: 'Memerlukan perhatian dan tindakan segera',
                icon: Icons.warning_amber_rounded,
                iconColor: const Color(0xFFDC2626),
                iconBackground: const Color(0xFFFEE2E2),
                cardColor: const Color(0xFFFFF7F7),
                description: 'Wilayah Awas menunjukkan kondisi darurat yang memerlukan tindakan segera. Pantau peta siaga dan ikuti instruksi tim lapangan.',
                onOpenMap: onOpenMap,
              ),
              const SizedBox(height: 16),
              _RiskStatusCard(
                status: 'Siaga',
                subtitle: 'Memerlukan kesiapasiagaan dan pemantauan tinggi',
                icon: Icons.notifications_active_rounded,
                iconColor: const Color(0xFFEA580C),
                iconBackground: const Color(0xFFFFEDD5),
                cardColor: const Color(0xFFFFFBEB),
                description: 'Wilayah Siaga menunjukkan peningkatan aktivitas yang perlu diawasi terus. Pastikan jalur evakuasi dan perlengkapan siaga sudah siap.',
                onOpenMap: onOpenMap,
              ),
              const SizedBox(height: 16),
              _RiskStatusCard(
                status: 'Waspada',
                subtitle: 'Pantau kondisi lapangan secara berkala',
                icon: Icons.remove_red_eye_rounded,
                iconColor: const Color(0xFF16A34A),
                iconBackground: const Color(0xFFDCFCE7),
                cardColor: const Color(0xFFF7FEE7),
                description: 'Wilayah Waspada berada dalam kondisi stabil, namun perlu tetap dipantau untuk memastikan tidak ada perubahan risiko yang membahayakan.',
                onOpenMap: onOpenMap,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RiskStatusCard extends StatelessWidget {
  const _RiskStatusCard({
    required this.status,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.iconBackground,
    required this.cardColor,
    required this.description,
    this.onOpenMap,
  });

  final String status;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final Color iconBackground;
  final Color cardColor;
  final String description;
  final VoidCallback? onOpenMap;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconBackground,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Icon(icon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      status,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            description,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF475569),
              height: 1.45,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    if (onOpenMap != null) {
                      onOpenMap!();
                      return;
                    }
                    Navigator.push(
                      context,
                      MaterialPageRoute<void>(
                        builder: (context) => const PetaBencanaPage(),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFC2410C),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  icon: const Icon(Icons.map_outlined, size: 18),
                  label: const Text('Lihat di Peta'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute<void>(
                        builder: (context) => const PanduanSiagaPage(),
                      ),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFC2410C),
                    side: const BorderSide(color: Color(0xFFEA580C)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  icon: const Icon(Icons.shield_outlined, size: 18),
                  label: const Text('Mitigasi'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
