import 'package:flutter/material.dart';

import '../../../reports/domain/entities/active_report.dart';

class ReportCard extends StatelessWidget {
  const ReportCard({required this.report, required this.onTap, super.key});

  final ActiveReport report;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      elevation: 1,
      shadowColor: theme.colorScheme.shadow.withValues(alpha: 0.12),
      color: theme.colorScheme.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      report.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  StatusBadge(status: report.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                report.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Icon(
                    Icons.schedule_outlined,
                    size: 16,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      _formatDate(report.createdAt),
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  Text(
                    report.trackingCode,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
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
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({required this.status, super.key});

  final String status;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final (label, foreground, background) = switch (status) {
      'under_review' => (
        'Ditinjau',
        colorScheme.onSecondaryContainer,
        colorScheme.secondaryContainer,
      ),
      'approved' => (
        'Disetujui',
        colorScheme.onPrimaryContainer,
        colorScheme.primaryContainer,
      ),
      'submitted' => (
        'Dikirim',
        colorScheme.onSurfaceVariant,
        colorScheme.surfaceContainerHighest,
      ),
      _ => (
        _humanizeStatus(status),
        colorScheme.onSurfaceVariant,
        colorScheme.surfaceContainerHighest,
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall
            ?.copyWith(color: foreground, fontWeight: FontWeight.w700),
      ),
    );
  }

  String _humanizeStatus(String value) {
    return value
        .split('_')
        .map(
          (word) => word.isEmpty
              ? word
              : '${word[0].toUpperCase()}${word.substring(1)}',
        )
        .join(' ');
  }
}
