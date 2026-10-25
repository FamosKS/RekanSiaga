import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../dashboard/presentation/providers/active_reports_provider.dart';
import '../../../dashboard/presentation/widgets/report_card.dart';
import '../../../reports/domain/entities/report.dart';
import '../../domain/entities/report_review.dart';
import '../providers/report_review_provider.dart';

class ReportDetailPage extends ConsumerWidget {
  const ReportDetailPage({required this.reportId, super.key});

  final String reportId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen<UpdateReportStatusState>(updateReportStatusControllerProvider, (
      previous,
      next,
    ) {
      if (next.status == ReportStatusUpdateState.success) {
        ref.invalidate(reportReviewProvider(reportId));
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('Status laporan berhasil diperbarui')),
          );
        ref.read(updateReportStatusControllerProvider.notifier).reset();
      } else if (next.status == ReportStatusUpdateState.error &&
          previous?.status != ReportStatusUpdateState.error) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(next.errorMessage ?? 'Gagal memperbarui status.'),
            ),
          );
        ref.read(updateReportStatusControllerProvider.notifier).reset();
      }
    });

    ref.listen<DeleteReportState>(deleteReportControllerProvider, (
      previous,
      next,
    ) {
      if (next.status == DeleteReportStatus.success) {
        ref.invalidate(reportReviewProvider(reportId));
        ref.invalidate(activeReportsProvider);
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('Laporan berhasil dihapus')),
          );
        Navigator.of(context).pop();
        ref.read(deleteReportControllerProvider.notifier).reset();
      } else if (next.status == DeleteReportStatus.error &&
          previous?.status != DeleteReportStatus.error) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(next.errorMessage ?? 'Gagal menghapus laporan.'),
            ),
          );
        ref.read(deleteReportControllerProvider.notifier).reset();
      }
    });

    final reportAsync = ref.watch(reportReviewProvider(reportId));
    final updateState = ref.watch(updateReportStatusControllerProvider);
    final deleteState = ref.watch(deleteReportControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detail Laporan'),
        actions: [
          IconButton(
            tooltip: 'Hapus laporan',
            onPressed:
                updateState.status == ReportStatusUpdateState.loading ||
                    deleteState.status == DeleteReportStatus.loading
                ? null
                : () => _confirmDelete(context, ref),
            icon: deleteState.status == DeleteReportStatus.loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.delete_outline),
          ),
        ],
      ),
      body: reportAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Gagal memuat detail laporan: $error',
              textAlign: TextAlign.center,
            ),
          ),
        ),
        data: (report) => _buildDetails(
          context,
          ref,
          report,
          isUpdating: updateState.status == ReportStatusUpdateState.loading,
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus laporan?'),
        content: const Text(
          'Laporan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.of(context).pop(true),
            icon: const Icon(Icons.delete_outline),
            label: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (shouldDelete == true) {
      await ref.read(deleteReportControllerProvider.notifier).delete(reportId);
    }
  }

  Widget _buildDetails(
    BuildContext context,
    WidgetRef ref,
    ReportReview report, {
    required bool isUpdating,
  }) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          elevation: 0,
          color: theme.colorScheme.surfaceContainerLow,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: theme.colorScheme.outlineVariant),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  report.title,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    StatusBadge(status: _statusValue(report.status)),
                    Text(
                      'Kode: ${report.trackingCode}',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      Icons.schedule_outlined,
                      size: 18,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatDate(report.createdAt),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _DetailRow(label: 'Jenis laporan', value: report.reportType),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          elevation: 0,
          color: theme.colorScheme.secondaryContainer.withValues(alpha: 0.35),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Deskripsi', style: theme.textTheme.titleMedium),
                const SizedBox(height: 12),
                SelectableText(
                  report.description,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    height: 1.55,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          elevation: 0,
          color: theme.colorScheme.surfaceContainerLow,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: theme.colorScheme.outlineVariant),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Pembaruan Status',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                if (isUpdating) ...[
                  const LinearProgressIndicator(),
                  const SizedBox(height: 12),
                ],
                for (final status in const [
                  ReportStatus.underReview,
                  ReportStatus.approved,
                  ReportStatus.resolved,
                ]) ...[
                  OutlinedButton.icon(
                    onPressed: isUpdating || report.status == status
                        ? null
                        : () => ref
                              .read(
                                updateReportStatusControllerProvider.notifier,
                              )
                              .update(reportId: report.id, newStatus: status),
                    icon: Icon(_statusIcon(status), size: 18),
                    label: Text(_statusLabel(status)),
                  ),
                  const SizedBox(height: 8),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _statusValue(ReportStatus status) {
    return switch (status) {
      ReportStatus.draft => 'draft',
      ReportStatus.submitted => 'submitted',
      ReportStatus.underReview => 'under_review',
      ReportStatus.approved => 'approved',
      ReportStatus.rejected => 'rejected',
      ReportStatus.resolved => 'resolved',
    };
  }

  IconData _statusIcon(ReportStatus status) {
    return switch (status) {
      ReportStatus.underReview => Icons.rate_review_outlined,
      ReportStatus.approved => Icons.check_circle_outline,
      ReportStatus.resolved => Icons.task_alt,
      _ => Icons.info_outline,
    };
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    final localDate = date.toLocal();
    final day = localDate.day.toString().padLeft(2, '0');
    final month = months[localDate.month - 1];
    final hour = localDate.hour.toString().padLeft(2, '0');
    final minute = localDate.minute.toString().padLeft(2, '0');
    return '$day $month ${localDate.year}, $hour:$minute';
  }

  String _statusLabel(ReportStatus status) {
    return switch (status) {
      ReportStatus.draft => 'Draft',
      ReportStatus.submitted => 'Dikirim',
      ReportStatus.underReview => 'Dalam Peninjauan',
      ReportStatus.approved => 'Disetujui',
      ReportStatus.rejected => 'Ditolak',
      ReportStatus.resolved => 'Selesai',
    };
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 132,
            child: Text(label, style: Theme.of(context).textTheme.labelLarge),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
