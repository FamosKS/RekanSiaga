import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class SosPage extends StatelessWidget {
  const SosPage({super.key});

  static const _contacts = [
    _EmergencyContact(
      title: 'Ambulans',
      number: '119',
      icon: Icons.medical_services_rounded,
      iconColor: Color(0xFFD94B3D),
      iconBackground: Color(0xFFFFE8E5),
    ),
    _EmergencyContact(
      title: 'Polisi',
      number: '110',
      icon: Icons.shield_rounded,
      iconColor: Color(0xFF28617E),
      iconBackground: Color(0xFFE5F1F6),
    ),
    _EmergencyContact(
      title: 'Pemadam Kebakaran',
      number: '113',
      icon: Icons.local_fire_department_outlined,
      iconColor: Color(0xFFDF7623),
      iconBackground: Color(0xFFFFF0DD),
    ),
    _EmergencyContact(
      title: 'Badan Nasional Pencarian...',
      number: '115',
      icon: Icons.radar_rounded,
      iconColor: Color(0xFF247A5A),
      iconBackground: Color(0xFFE4F4EC),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                key: const ValueKey('sos-back-button'),
                onTap: () => context.pop(),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.07),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: const Icon(
                    Icons.arrow_back_ios_new,
                    size: 18,
                    color: Color(0xFF172033),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFE8E5),
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: const Icon(
                      Icons.crisis_alert_rounded,
                      color: Color(0xFFD94B3D),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Pusat Darurat',
                      style: textTheme.headlineSmall?.copyWith(
                        color: const Color(0xFF172033),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'RekanSiaga • Bantuan 24 jam',
                style: textTheme.bodySmall?.copyWith(
                  color: Colors.blueGrey[600],
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                'Akses cepat bantuan dan pancarkan lokasi Anda.',
                style: textTheme.bodySmall?.copyWith(
                  color: Colors.blueGrey[500],
                ),
              ),
              const SizedBox(height: 36),
              Center(
                child: _SosButton(
                  onLongPress: () => _showUnavailableAction(
                    context,
                    'Pengiriman SOS dan lokasi belum terhubung.',
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Tekan & tahan 3 detik untuk memancarkan lokasi Anda ke Relawan & SAR',
                textAlign: TextAlign.center,
                style: textTheme.bodySmall?.copyWith(
                  color: Colors.blueGrey[600],
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.circle, size: 8, color: Color(0xFF247A5A)),
                  const SizedBox(width: 5),
                  Text(
                    'GPS aktif • lokasi siap dibagikan',
                    style: textTheme.labelSmall?.copyWith(
                      color: const Color(0xFF247A5A),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Kontak Darurat',
                    style: textTheme.titleSmall?.copyWith(
                      color: const Color(0xFF172033),
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    'Satu ketukan',
                    style: textTheme.labelSmall?.copyWith(
                      color: const Color(0xFFD94B3D),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              for (final contact in _contacts) ...[
                _EmergencyContactCard(contact: contact),
                const SizedBox(height: 7),
              ],
            ],
          ),
        ),
      ),
    );
  }

  static void _showUnavailableAction(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }
}

class _SosButton extends StatelessWidget {
  const _SosButton({required this.onLongPress});

  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPress: onLongPress,
      child: Container(
        width: 180,
        height: 180,
        decoration: BoxDecoration(
          color: const Color(0xFFD34B3B),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 8),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFD34B3B).withValues(alpha: 0.28),
              blurRadius: 24,
              spreadRadius: 6,
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'SOS',
              style: Theme.of(context).textTheme.displaySmall
                  ?.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 3),
            Text(
              'TAHAN 3 DETIK',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: Colors.white,
                letterSpacing: 1.4,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmergencyContactCard extends StatelessWidget {
  const _EmergencyContactCard({required this.contact});

  final _EmergencyContact contact;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Card(
      margin: EdgeInsets.zero,
      color: Colors.white,
      elevation: 1,
      shadowColor: Colors.black.withValues(alpha: 0.07),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: contact.iconBackground,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(contact.icon, color: contact.iconColor, size: 19),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contact.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.labelLarge?.copyWith(
                      color: const Color(0xFF172033),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    contact.number,
                    style: textTheme.labelSmall?.copyWith(
                      color: Colors.blueGrey[600],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context)
                  ..hideCurrentSnackBar()
                  ..showSnackBar(
                    SnackBar(
                      content: Text(
                        'Panggilan ${contact.number} belum terhubung.',
                      ),
                    ),
                  );
              },
              icon: const Icon(Icons.call_outlined, size: 13),
              label: const Text('Panggil'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF21684E),
                foregroundColor: Colors.white,
                elevation: 0,
                minimumSize: const Size(0, 32),
                padding: const EdgeInsets.symmetric(horizontal: 9),
                shape: const StadiumBorder(),
                textStyle: textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmergencyContact {
  const _EmergencyContact({
    required this.title,
    required this.number,
    required this.icon,
    required this.iconColor,
    required this.iconBackground,
  });

  final String title;
  final String number;
  final IconData icon;
  final Color iconColor;
  final Color iconBackground;
}
