import '../../../reports/domain/entities/report.dart';

class AuditLogEntry {
  const AuditLogEntry({
    required this.id,
    required this.reportId,
    required this.actorStaffId,
    required this.previousStatus,
    required this.newStatus,
    this.note,
    required this.createdAt,
  });

  final String id;
  final String reportId;
  final String actorStaffId;
  final ReportStatus previousStatus;
  final ReportStatus newStatus;
  final String? note;
  final DateTime createdAt;
}
