import 'report.dart';

class SubmittedReport {
  const SubmittedReport({
    required this.id,
    required this.trackingCode,
    required this.title,
    required this.description,
    required this.reportType,
    required this.status,
  });

  final String id;
  final String trackingCode;
  final String title;
  final String description;
  final String reportType;
  final ReportStatus status;
}
