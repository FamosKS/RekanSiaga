import '../entities/active_report.dart';

abstract interface class ActiveReportRepository {
  Future<List<ActiveReport>> getActiveReports();
}
