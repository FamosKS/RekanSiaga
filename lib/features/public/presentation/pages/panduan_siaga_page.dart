import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'ceklis_tas_siaga_page.dart';
import 'detail_panduan_page.dart';
import 'semua_panduan_page.dart';

class PanduanSiagaPage extends StatefulWidget {
  const PanduanSiagaPage({super.key});

  @override
  State<PanduanSiagaPage> createState() => _PanduanSiagaPageState();
}

class _PanduanSiagaPageState extends State<PanduanSiagaPage> {
  static const _learningItems = [
    _LearningItem(
      tag: 'VIDEO',
      title: 'Cara Melakukan CPR Dasar',
      time: 'Video • 4 menit',
      image: 'assets/images/news-image-1.png',
      isVideo: true,
    ),
    _LearningItem(
      tag: 'ARTIKEL',
      title: 'Nomor Penting Saat Darurat',
      time: 'Artikel • 3 menit',
      image: 'assets/images/news-image-2.png',
      isVideo: false,
    ),
    _LearningItem(
      tag: 'VIDEO',
      title: 'Persiapan Tas Siaga Bencana',
      time: 'Video • 5 menit',
      image: 'assets/images/news-card-3.png',
      isVideo: true,
    ),
  ];

  double _tasSiagaProgress = 0.0;

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
                key: const ValueKey('guide-back-button'),
                onTap: () => context.pop(),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(11),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 7,
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
              const SizedBox(height: 20),
              Text(
                'RekanSiaga • Edukasi',
                style: textTheme.bodySmall?.copyWith(
                  color: Colors.blueGrey[600],
                ),
              ),
              const SizedBox(height: 3),
              Text(
                'Panduan Siaga',
                style: textTheme.headlineMedium?.copyWith(
                  color: const Color(0xFF172033),
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 12),
              _buildEmergencyBagCard(context),
              const SizedBox(height: 16),
              _buildSectionHeading(
                context,
                title: 'Panduan Berdasarkan Bencana',
                action: 'Lihat semua',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (context) => const SemuaPanduanPage(),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.85,
                children: [
                  _buildGuideCard(
                    context,
                    const Color(0xFFFCE9E7),
                    Icons.monitor_heart_rounded,
                    'Saat Gempa Terjadi',
                    const Color(0xFFD94B3D),
                  ),
                  _buildGuideCard(
                    context,
                    const Color(0xFFE7F2F7),
                    Icons.flood_outlined,
                    'Evakuasi Banjir',
                    const Color(0xFF28617E),
                  ),
                  _buildGuideCard(
                    context,
                    const Color(0xFFFFF0DC),
                    Icons.local_fire_department_rounded,
                    'Pencegahan Karhutla',
                    const Color(0xFFD36A18),
                  ),
                  _buildGuideCard(
                    context,
                    const Color(0xFFE5F3EC),
                    Icons.landscape_rounded,
                    'Siaga Erupsi Gunung',
                    const Color(0xFF247A5A),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _buildSectionHeading(
                context,
                title: 'Belajar Cepat',
                action: 'Geser →',
                onTap: () => _showMessage(context, 'Materi belajar'),
              ),
              const SizedBox(height: 9),
              SizedBox(
                height: 120,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _learningItems.length,
                  itemBuilder: (context, index) =>
                      _buildLearningCard(_learningItems[index]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmergencyBagCard(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Card(
      margin: EdgeInsets.zero,
      color: Colors.white,
      elevation: 1.5,
      shadowColor: Colors.black.withValues(alpha: 0.08),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      child: InkWell(
        onTap: () async {
          final result = await Navigator.push<double>(
            context,
            MaterialPageRoute<double>(
              builder: (context) => const CeklisTasSiagaPage(),
            ),
          );
          if (result != null && mounted) {
            setState(() {
              _tasSiagaProgress = result;
            });
          }
        },
        borderRadius: BorderRadius.circular(15),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFECD8),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: const Icon(
                  Icons.backpack,
                  color: Color(0xFFB84E00),
                  size: 25,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Ceklis Tas Siaga Bencana Anda',
                            style: textTheme.labelLarge?.copyWith(
                              color: const Color(0xFF172033),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        Icon(
                          Icons.chevron_right,
                          color: Colors.blueGrey[500],
                          size: 20,
                        ),
                      ],
                    ),
                    const SizedBox(height: 7),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: _tasSiagaProgress,
                        minHeight: 5,
                        backgroundColor: Color(0xFFE5E7EB),
                        color: Color(0xFFB84E00),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${(_tasSiagaProgress * 100).toInt()}% Selesai',
                      style: textTheme.labelSmall?.copyWith(
                        color: const Color(0xFFB84E00),
                        fontWeight: FontWeight.w600,
                      ),
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

  Widget _buildSectionHeading(
    BuildContext context, {
    required String title,
    required String action,
    required VoidCallback onTap,
  }) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: textTheme.titleSmall?.copyWith(
              color: const Color(0xFF172033),
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        TextButton(
          onPressed: onTap,
          style: TextButton.styleFrom(
            foregroundColor: const Color(0xFFB84E00),
            padding: EdgeInsets.zero,
            minimumSize: const Size(0, 30),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            textStyle: textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          child: Text(action),
        ),
      ],
    );
  }

  Widget _buildGuideCard(
    BuildContext context,
    Color bgColor,
    IconData icon,
    String title,
    Color iconColor,
  ) {
    return Material(
      color: bgColor,
      borderRadius: BorderRadius.circular(15),
      child: InkWell(
        borderRadius: BorderRadius.circular(15),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute<void>(
            builder: (context) => DetailPanduanPage(title: title),
          ),
        ),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: iconColor.withValues(alpha: 0.10)),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(15),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Icon(icon, color: iconColor, size: 27),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF172033),
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  height: 1.25,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLearningCard(_LearningItem item) {
    return SizedBox(
      width: 280,
      child: Card(
        margin: const EdgeInsets.only(right: 10),
        color: Colors.white,
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(9),
                child: SizedBox(
                  width: 80,
                  height: 88,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.asset(
                        item.image,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            ColoredBox(
                              color: Colors.grey.shade200,
                              child: const Icon(Icons.image_outlined),
                            ),
                      ),
                      if (item.isVideo)
                        Center(
                          child: Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.88),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.play_arrow_rounded,
                              size: 20,
                              color: Color(0xFFB84E00),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        item.tag,
                        style: const TextStyle(
                          color: Color(0xFFB84E00),
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        item.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF172033),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          height: 1.2,
                        ),
                      ),
                      Row(
                        children: [
                          Icon(
                            Icons.access_time,
                            size: 12,
                            color: Colors.blueGrey[400],
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              item.time,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: Colors.blueGrey[500],
                                fontSize: 9,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static void _showMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text('$message segera hadir.')));
  }
}

class _LearningItem {
  const _LearningItem({
    required this.tag,
    required this.title,
    required this.time,
    required this.image,
    required this.isVideo,
  });

  final String tag;
  final String title;
  final String time;
  final String image;
  final bool isVideo;
}
