import '../entities/report_review.dart';
import '../../../reports/domain/entities/report.dart';

abstract interface class ReportAdminRepository {
  Future<ReportReview> getReportById(String reportId);

  Future<ReportReview> updateReportStatus({
    required String reportId,
    required ReportStatus newStatus,
    required String actorStaffId,
    String? note,
  });
}
