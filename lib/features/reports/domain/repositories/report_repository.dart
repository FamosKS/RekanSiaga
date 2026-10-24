import '../entities/report.dart';

abstract interface class ReportRepository {
  Future<Report> submitReport({required Report report});

  Future<Report?> trackReportByTrackingCode(String trackingCode);
}
