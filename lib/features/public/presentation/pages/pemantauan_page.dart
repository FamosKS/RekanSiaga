import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class PemantauanPage extends StatelessWidget {
  const PemantauanPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GestureDetector(
                    key: const ValueKey('monitoring-back-button'),
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
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pemantauan Terkini',
                          style: Theme.of(context).textTheme.headlineSmall
                              ?.copyWith(
                                color: const Color(0xFF172033),
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          'Status bencana, kategori risiko, dan akses mitigasi untuk wilayah Anda.',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: Colors.blueGrey[600],
                                height: 1.4,
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _buildStatusCard(
                context,
                color: const Color(0xFFD94B3D),
                paleColor: const Color(0xFFFFE8E5),
                icon: Icons.warning_rounded,
                title: 'Awas',
                subtitle: '5 daerah memerlukan perhatian segera',
                statistics: const [
                  _MonitoringStatistic(
                    icon: Icons.flood_outlined,
                    title: 'Banjir',
                    detail: '3 daerah',
                  ),
                  _MonitoringStatistic(
                    icon: Icons.landscape_outlined,
                    title: 'Gunung Api',
                    detail: '2 daerah',
                  ),
                ],
                description: 'Wilayah Awas menunjukkan kondisi darurat yang memerlukan tindakan segera. Pantau peta siaga dan ikuti instruksi tim lapangan.',
              ),
              const SizedBox(height: 12),
              _buildStatusCard(
                context,
                color: const Color(0xFFC64D0A),
                paleColor: const Color(0xFFFFECD8),
                icon: Icons.notifications_active_rounded,
                title: 'Siaga',
                subtitle: '5 daerah perlu kesiapsiagaan tinggi',
                statistics: const [
                  _MonitoringStatistic(
                    icon: Icons.monitor_heart_outlined,
                    title: 'Gempa',
                    detail: '5 daerah',
                  ),
                ],
                description: 'Wilayah Siaga menunjukkan peningkatan aktivitas yang perlu diawasi terus. Pastikan jalur evakuasi dan perlengkapan siaga sudah siap.',
              ),
              const SizedBox(height: 12),
              _buildStatusCard(
                context,
                color: const Color(0xFF247A5A),
                paleColor: const Color(0xFFE4F4EC),
                icon: Icons.remove_red_eye,
                title: 'Waspada',
                subtitle: 'Pantau kondisi lapangan secara berkala',
                statistics: const [],
                description: 'Tetap perbarui informasi wilayah Anda dan ikuti arahan resmi untuk menjaga keselamatan bersama.',
                showActions: false,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusCard(
    BuildContext context, {
    required Color color,
    required Color paleColor,
    required IconData icon,
    required String title,
    required String subtitle,
    required List<_MonitoringStatistic> statistics,
    required String description,
    bool showActions = true,
  }) {
    final textTheme = Theme.of(context).textTheme;

    return Card(
      margin: EdgeInsets.zero,
      color: Colors.white,
      elevation: 1.5,
      shadowColor: Colors.black.withValues(alpha: 0.08),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      child: Padding(
        padding: const EdgeInsets.all(13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: paleColor,
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Icon(icon, color: color, size: 19),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: textTheme.titleSmall?.copyWith(
                          color: const Color(0xFF172033),
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: textTheme.labelSmall?.copyWith(
                          color: Colors.blueGrey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (statistics.isNotEmpty) ...[
              const SizedBox(height: 11),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final statistic in statistics)
                    SizedBox(
                      width: statistics.length == 1
                          ? double.infinity
                          : (MediaQuery.sizeOf(context).width - 80) / 2,
                      child: _StatisticTile(
                        statistic: statistic,
                        color: color,
                        paleColor: paleColor,
                      ),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 10),
            Text(
              description,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: textTheme.bodySmall?.copyWith(
                color: Colors.blueGrey[600],
                height: 1.4,
              ),
            ),
            if (showActions) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.map_outlined, size: 16),
                      label: const Text('Lihat di Peta'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFB84E00),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        minimumSize: const Size(0, 36),
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        textStyle: textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.push('/panduan'),
                      icon: const Icon(
                        Icons.shield_outlined,
                        size: 16,
                        color: Color(0xFFB84E00),
                      ),
                      label: const Text('Mitigasi'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF172033),
                        side: BorderSide(color: Colors.blueGrey.shade100),
                        minimumSize: const Size(0, 36),
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        textStyle: textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatisticTile extends StatelessWidget {
  const _StatisticTile({
    required this.statistic,
    required this.color,
    required this.paleColor,
  });

  final _MonitoringStatistic statistic;
  final Color color;
  final Color paleColor;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.orange[50],
        borderRadius: BorderRadius.circular(11),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: paleColor,
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(statistic.icon, color: color, size: 15),
          ),
          const SizedBox(width: 7),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  statistic.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.labelSmall?.copyWith(
                    color: const Color(0xFF172033),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  statistic.detail,
                  style: textTheme.labelSmall?.copyWith(
                    color: Colors.blueGrey[600],
                    fontSize: 10,
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

class _MonitoringStatistic {
  const _MonitoringStatistic({
    required this.icon,
    required this.title,
    required this.detail,
  });

  final IconData icon;
  final String title;
  final String detail;
}
