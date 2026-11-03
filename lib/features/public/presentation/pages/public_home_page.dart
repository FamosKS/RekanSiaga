import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/accessibility/accessibility_settings.dart';
import '../../../content/data/article_repository.dart';
import '../../../content/domain/article.dart';
import '../../../content/presentation/article_cover.dart';
import '../widgets/disaster_warning_dialog.dart';

class PublicHomePage extends StatefulWidget {
  const PublicHomePage({
    super.key,
    required this.onOpenMap,
    required this.onOpenReport,
    required this.onOpenEmergency,
  });

  final VoidCallback onOpenMap;
  final VoidCallback onOpenReport;
  final VoidCallback onOpenEmergency;

  @override
  State<PublicHomePage> createState() => _PublicHomePageState();
}

class _PublicHomePageState extends State<PublicHomePage> {
  String _textSize = 'Normal';
  bool _highContrast = false;
  bool _autoReadText = true;
  bool _showSignLanguage = false;

  @override
  void initState() {
    super.initState();
    _highContrast = isHighContrastNotifier.value;
    _textSize = switch (fontSizeFactorNotifier.value) {
      1.2 => 'Besar',
      1.4 => 'Sangat Besar',
      _ => 'Normal',
    };
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(requestLocationPermission());
    });
  }

  Future<void> requestLocationPermission() async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (!mounted || permission != LocationPermission.deniedForever) {
        return;
      }

      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text(
              'Izin lokasi ditolak permanen. Aktifkan izin lokasi melalui pengaturan aplikasi.',
            ),
          ),
        );
    } on PlatformException catch (error, stackTrace) {
      debugPrint('Unable to request location permission: $error\n$stackTrace');
      if (!mounted) return;

      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Izin lokasi tidak dapat diminta saat ini.'),
          ),
        );
    }
  }

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
              _HomeHeader(
                onEmergencyTap: widget.onOpenEmergency,
                onAccessibilityTap: () => _showAccessibilityModal(context),
              ),
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
              _HighlightCard(
                onReportTap: widget.onOpenReport,
                onMapTap: widget.onOpenMap,
              ),
              const SizedBox(height: 14),
              _RiskAnalysisCard(
                onPreviewWarning: () {
                  unawaited(showDisasterWarningDialog(context));
                },
              ),
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

  Future<void> _showAccessibilityModal(BuildContext context) {
    var selectedTextSize = _textSize;
    var highContrast = _highContrast;
    var autoReadText = _autoReadText;
    var showSignLanguage = _showSignLanguage;

    return showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return Dialog(
          backgroundColor: Colors.white,
          insetPadding: const EdgeInsets.symmetric(
            horizontal: 20,
            vertical: 24,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          child: StatefulBuilder(
            builder: (context, setDialogState) {
              return SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Aksesibilitas & Bantuan Khusus',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1E293B),
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(dialogContext).pop(),
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFFF1F5F9),
                          ),
                          icon: const Icon(
                            Icons.close_rounded,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: const [
                        Expanded(
                          child: Text(
                            'Ukuran Teks',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1E293B),
                            ),
                          ),
                        ),
                        Text(
                          'A-  A+',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        for (final option in const [
                          'Normal',
                          'Besar',
                          'Sangat Besar',
                        ])
                          Expanded(
                            child: Padding(
                              padding: EdgeInsets.only(
                                right: option == 'Sangat Besar' ? 0 : 6,
                              ),
                              child: OutlinedButton(
                                onPressed: () {
                                  setDialogState(() {
                                    selectedTextSize = option;
                                  });
                                },
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size(0, 38),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 4,
                                  ),
                                  foregroundColor: selectedTextSize == option
                                      ? const Color(0xFFC05621)
                                      : const Color(0xFF64748B),
                                  backgroundColor: selectedTextSize == option
                                      ? const Color(0xFFFFF2E7)
                                      : Colors.white,
                                  side: BorderSide(
                                    color: selectedTextSize == option
                                        ? const Color(0xFFC05621)
                                        : const Color(0xFFE2E8F0),
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: FittedBox(
                                  child: Text(
                                    option,
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Kontras Tinggi',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      subtitle: const Text(
                        'Mode Gelap/Terang Khusus',
                        style: TextStyle(color: Color(0xFF64748B)),
                      ),
                      value: highContrast,
                      activeThumbColor: const Color(0xFFC05621),
                      onChanged: (value) {
                        setDialogState(() => highContrast = value);
                      },
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Bacakan Teks Otomatis',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      subtitle: const Text(
                        'Screen Reader Helper',
                        style: TextStyle(color: Color(0xFF64748B)),
                      ),
                      value: autoReadText,
                      activeThumbColor: const Color(0xFFC05621),
                      onChanged: (value) {
                        setDialogState(() => autoReadText = value);
                      },
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Tampilkan Video Bahasa Isyarat pada Berita/Darurat',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      value: showSignLanguage,
                      activeThumbColor: const Color(0xFFC05621),
                      onChanged: (value) {
                        setDialogState(() => showSignLanguage = value);
                      },
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          setState(() {
                            _textSize = selectedTextSize;
                            _highContrast = highContrast;
                            _autoReadText = autoReadText;
                            _showSignLanguage = showSignLanguage;
                          });
                          fontSizeFactorNotifier.value =
                              switch (selectedTextSize) {
                                'Besar' => 1.2,
                                'Sangat Besar' => 1.4,
                                _ => 1.0,
                              };
                          isHighContrastNotifier.value = highContrast;
                          Navigator.of(dialogContext).pop();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFC05621),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          minimumSize: const Size.fromHeight(44),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Simpan Pengaturan'),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({
    required this.onEmergencyTap,
    required this.onAccessibilityTap,
  });

  final VoidCallback onEmergencyTap;
  final VoidCallback onAccessibilityTap;

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
        const SizedBox(width: 8),
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
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  'RekanSiaga',
                  maxLines: 1,
                  softWrap: false,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.titleMedium?.copyWith(
                    color: const Color(0xFF172033),
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    height: 1.05,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            InkWell(
              onTap: onAccessibilityTap,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF2E7),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFFC05621).withValues(alpha: 0.35),
                  ),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.accessibility_new_rounded,
                  size: 20,
                  color: Color(0xFFC05621),
                ),
              ),
            ),
            const SizedBox(width: 5),
            ElevatedButton.icon(
              onPressed: onEmergencyTap,
              icon: const Icon(Icons.notifications_active_outlined, size: 15),
              label: const Text('Darurat (SOS)'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD34B3B),
                foregroundColor: Colors.white,
                elevation: 0,
                minimumSize: const Size(0, 36),
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                shape: const StadiumBorder(),
                textStyle: textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
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
  const _RiskAnalysisCard({required this.onPreviewWarning});

  final VoidCallback onPreviewWarning;

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
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onPreviewWarning,
                icon: const Icon(Icons.warning_amber_rounded, size: 17),
                label: const Text('Pratinjau peringatan'),
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFFB84E00),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  visualDensity: VisualDensity.compact,
                ),
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
    final repository = ArticleRepository();

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
        FutureBuilder<Article?>(
          future: repository.featured(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(
                child: CircularProgressIndicator(color: Color(0xFFF57C00)),
              );
            }
            if (snapshot.hasError) {
              return _newsState(
                context,
                Icons.cloud_off_outlined,
                'Artikel tidak dapat dimuat. Periksa koneksi internet.',
              );
            }
            final article = snapshot.data;
            if (article == null) {
              return _newsState(
                context,
                Icons.article_outlined,
                'Belum ada artikel published.',
              );
            }
            return InkWell(
              onTap: () => context.push('/article/${article.slug}'),
              borderRadius: BorderRadius.circular(10),
              child: Ink(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: ArticleCover(
                        article: article,
                        repository: repository,
                        height: 92,
                        width: 92,
                      ),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              article.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                            if (article.publishedAt != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                _formatNewsDate(article.publishedAt!),
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  String _formatNewsDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  Widget _newsState(BuildContext context, IconData icon, String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF64748B)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: Color(0xFF64748B), height: 1.35),
            ),
          ),
        ],
      ),
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
