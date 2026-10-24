import '../../../reports/domain/entities/report.dart';

class ReportReview {
  const ReportReview({
    required this.id,
    required this.trackingCode,
    required this.title,
    required this.description,
    required this.reportType,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String trackingCode;
  final String title;
  final String description;
  final String reportType;
  final ReportStatus status;
  final DateTime createdAt;
}
