import 'package:flutter/material.dart';

class PublicHomePage extends StatelessWidget {
  const PublicHomePage({
    super.key,
    required this.onOpenMap,
    required this.onOpenReport,
    required this.onOpenEmergency,
  });

  final VoidCallback onOpenMap;
  final VoidCallback onOpenReport;
  final VoidCallback onOpenEmergency;

  static const _newsImages = [
    'assets/images/news-image-1.png',
    'assets/images/news-image-2.png',
    'assets/images/news-card-3.png',
  ];

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return ColoredBox(
      color: Colors.grey[50]!,
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _HomeHeader(onEmergencyTap: onOpenEmergency),
              const SizedBox(height: 18),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Selamat datang',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      'Hi, RekanSiaga',
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(
                            color: const Color(0xFF172033),
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              _HighlightCard(onReportTap: onOpenReport, onMapTap: onOpenMap),
              const SizedBox(height: 14),
              const _RiskAnalysisCard(),
              const SizedBox(height: 12),
              _NewsSection(
                onSeeAll: () => _showComingSoon(context, 'Berita terbaru'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text('$feature segera hadir.')));
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({required this.onEmergencyTap});

  final VoidCallback onEmergencyTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      children: [
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Center(
            child: Image.asset(
              'assets/images/Logo.png',
              width: 32,
              height: 32,
              fit: BoxFit.contain,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Sistem Siaga',
                style: textTheme.labelSmall?.copyWith(
                  color: Colors.blueGrey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                'RekanSiaga',
                style: textTheme.titleLarge?.copyWith(
                  color: const Color(0xFF172033),
                  fontWeight: FontWeight.w800,
                  height: 1.05,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        ElevatedButton.icon(
          onPressed: onEmergencyTap,
          icon: const Icon(Icons.notifications_active_outlined, size: 15),
          label: const Text('Darurat (SOS)'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFD34B3B),
            foregroundColor: Colors.white,
            elevation: 0,
            minimumSize: const Size(0, 36),
            padding: const EdgeInsets.symmetric(horizontal: 10),
            shape: const StadiumBorder(),
            textStyle: textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

class _HighlightCard extends StatelessWidget {
  const _HighlightCard({required this.onReportTap, required this.onMapTap});

  final VoidCallback onReportTap;
  final VoidCallback onMapTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    const accent = Color(0xFFB84E00);

    return Card(
      margin: EdgeInsets.zero,
      color: Colors.white,
      elevation: 1.5,
      shadowColor: Colors.black.withValues(alpha: 0.10),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: const _HomeImage(
              path: 'assets/images/hero-image.png',
              height: 114,
              width: double.infinity,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 9, 10, 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'BNPB Pastikan Dukungan Operasional Berlanjut untuk Penanganan Karhutla Kaltim',
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.titleSmall?.copyWith(
                    color: const Color(0xFF172033),
                    fontWeight: FontWeight.w800,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  'Baca selengkapnya untuk mengetahui update terbaru dan langkah siaga yang perlu dilakukan.',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.bodySmall?.copyWith(
                    color: Colors.blueGrey[600],
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 2, 10, 9),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: onReportTap,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accent,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      minimumSize: const Size.fromHeight(34),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(11),
                      ),
                      textStyle: textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    child: const Text('Lapor Sekarang'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: onMapTap,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF172033),
                      side: BorderSide(color: Colors.blueGrey.shade100),
                      minimumSize: const Size.fromHeight(34),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(11),
                      ),
                      textStyle: textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    child: const Text('Cek Peta'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RiskAnalysisCard extends StatelessWidget {
  const _RiskAnalysisCard();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    const safeGreen = Color(0xFF174D39);

    return Card(
      margin: EdgeInsets.zero,
      color: Colors.white,
      elevation: 1.5,
      shadowColor: Colors.black.withValues(alpha: 0.10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(10, 10, 10, 11),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Analisis Risiko Lokasi Saya',
                    style: textTheme.titleSmall?.copyWith(
                      color: const Color(0xFF172033),
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 11,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: safeGreen,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Aman',
                    style: textTheme.labelSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              'Status terhubung ke peta siaga',
              style: textTheme.bodySmall?.copyWith(color: Colors.blueGrey[500]),
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: const LinearProgressIndicator(
                value: 0.68,
                minHeight: 6,
                backgroundColor: Color(0xFFE5E7EB),
                color: safeGreen,
              ),
            ),
            const SizedBox(height: 5),
            Row(
              children: [
                Text(
                  'Risiko rendah',
                  style: textTheme.labelSmall?.copyWith(
                    color: Colors.blueGrey[600],
                  ),
                ),
                const Spacer(),
                Text(
                  '68%',
                  style: textTheme.labelSmall?.copyWith(
                    color: safeGreen,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Lokasi Anda saat ini berada dalam zona aman. Pantau peta siaga untuk memantau perubahan kondisi lapangan.',
              style: textTheme.bodySmall?.copyWith(
                color: Colors.blueGrey[500],
                height: 1.35,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NewsSection extends StatelessWidget {
  const _NewsSection({required this.onSeeAll});

  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Berita Terbaru',
                style: textTheme.titleSmall?.copyWith(
                  color: const Color(0xFF172033),
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            TextButton(
              onPressed: onSeeAll,
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFFB84E00),
                padding: EdgeInsets.zero,
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text('Lihat semua'),
            ),
          ],
        ),
        const SizedBox(height: 4),
        SizedBox(
          height: 100,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: PublicHomePage._newsImages.length,
            itemBuilder: (context, index) => Padding(
              padding: EdgeInsets.only(
                right: index == PublicHomePage._newsImages.length - 1 ? 0 : 10,
              ),
              child: Card(
                margin: EdgeInsets.zero,
                elevation: 1,
                clipBehavior: Clip.antiAlias,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: _HomeImage(
                    path: PublicHomePage._newsImages[index],
                    height: 100,
                    width: 100,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _HomeImage extends StatelessWidget {
  const _HomeImage({
    required this.path,
    required this.height,
    required this.width,
  });

  final String path;
  final double height;
  final double width;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      path,
      height: height,
      width: width,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => Container(
        height: height,
        width: width,
        color: Colors.grey[200],
        alignment: Alignment.center,
        child: Icon(Icons.image_outlined, color: Colors.grey[500]),
      ),
    );
  }
}
