import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class MyReportsPage extends StatelessWidget {
  const MyReportsPage({super.key});

  Stream<List<Map<String, dynamic>>> get _reportsStream => Supabase
      .instance
      .client
      .from('public_reports')
      .stream(primaryKey: ['id'])
      .order('created_at', ascending: false);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 1,
        centerTitle: true,
        leading: Navigator.canPop(context)
            ? IconButton(
                tooltip: 'Kembali',
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.arrow_back, color: Color(0xFFC05621)),
              )
            : null,
        title: const Text(
          'Laporan Saya',
          style: TextStyle(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: StreamBuilder<List<Map<String, dynamic>>>(
        stream: _reportsStream,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _MessageState(
              icon: Icons.error_outline_rounded,
              message: 'Laporan gagal dimuat: ${snapshot.error}',
            );
          }

          final reports = snapshot.data ?? const [];
          if (reports.isEmpty) {
            return const _MessageState(
              icon: Icons.assignment_outlined,
              message: 'Belum ada laporan yang dikirim.',
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            itemCount: reports.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, index) =>
                _ReportCard(report: reports[index]),
          );
        },
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  const _ReportCard({required this.report});

  final Map<String, dynamic> report;

  @override
  Widget build(BuildContext context) {
    final status = report['status']?.toString() ?? '';
    final badge = _statusBadge(status);
    final title = report['title']?.toString() ?? 'Tanpa judul';
    final reportType =
        report['report_type']?.toString() ?? 'Jenis tidak diketahui';
    final description =
        report['description']?.toString() ?? 'Tidak ada deskripsi.';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF1E293B),
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        reportType,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFFC05621),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _StatusBadge(status: status, badge: badge),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _formatDate(report['created_at']),
              style: Theme.of(context).textTheme.labelSmall
                  ?.copyWith(color: const Color(0xFF64748B)),
            ),
            const SizedBox(height: 12),
            Text(
              description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(height: 1.45, color: const Color(0xFF64748B)),
            ),
            const SizedBox(height: 18),
            _TrackingTimeline(status: status),
          ],
        ),
      ),
    );
  }

  String _formatDate(dynamic value) {
    final date = DateTime.tryParse(value?.toString() ?? '');
    if (date == null) return '-';
    final local = date.toLocal();
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Ags',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '${local.day} ${months[local.month - 1]} ${local.year}, $hour:$minute';
  }
}

class _TrackingTimeline extends StatelessWidget {
  const _TrackingTimeline({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final activeStep = switch (status) {
      'unverified' => 0,
      'under_review' => 1,
      'verified' => 2,
      _ => 0,
    };
    const labels = ['Dikirim', 'Diterima', 'Dievaluasi'];

    return Row(
      children: [
        for (var i = 0; i < labels.length; i++) ...[
          Expanded(
            child: _TimelineStep(
              label: labels[i],
              active: i <= activeStep,
              current: i == activeStep,
              isLast: i == labels.length - 1,
            ),
          ),
        ],
      ],
    );
  }
}

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    required this.label,
    required this.active,
    required this.current,
    required this.isLast,
  });

  final String label;
  final bool active;
  final bool current;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: active
                    ? const Color(0xFFC05621)
                    : const Color(0xFFE2E8F0),
              ),
              child: active
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            if (!isLast)
              Expanded(
                child: Container(
                  height: 3,
                  color: active
                      ? const Color(0xFFC05621)
                      : const Color(0xFFE2E8F0),
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        Align(
          alignment: Alignment.centerLeft,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: current ? FontWeight.w700 : FontWeight.w500,
              color: active ? const Color(0xFF1E293B) : const Color(0xFF64748B),
            ),
          ),
        ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status, required this.badge});

  final String status;
  final _StatusBadgeData badge;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 155),
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: badge.background,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(badge.icon, size: 15, color: badge.foreground),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              badge.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: badge.foreground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadgeData {
  const _StatusBadgeData({
    required this.label,
    required this.icon,
    required this.background,
    required this.foreground,
  });

  final String label;
  final IconData icon;
  final Color background;
  final Color foreground;
}

_StatusBadgeData _statusBadge(String status) {
  return switch (status) {
    'unverified' => const _StatusBadgeData(
      label: 'Dikirim',
      icon: Icons.send_rounded,
      background: Color(0xFFE8F1FB),
      foreground: Color(0xFF5B718A),
    ),
    'under_review' => const _StatusBadgeData(
      label: 'Diterima / Diproses',
      icon: Icons.access_time_filled_rounded,
      background: Color(0xFFFFF1D6),
      foreground: Color(0xFFB84E00),
    ),
    'verified' => const _StatusBadgeData(
      label: 'Dievaluasi',
      icon: Icons.check_circle_rounded,
      background: Color(0xFFE4F4EC),
      foreground: Color(0xFF247A5A),
    ),
    _ => const _StatusBadgeData(
      label: 'Tidak diketahui',
      icon: Icons.help_outline_rounded,
      background: Color(0xFFF0F1F3),
      foreground: Color(0xFF586174),
    ),
  };
}

class _MessageState extends StatelessWidget {
  const _MessageState({required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: Colors.blueGrey[400]),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.blueGrey[600]),
            ),
          ],
        ),
      ),
    );
  }
}
