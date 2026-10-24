import '../entities/report.dart';
import '../entities/report_submission.dart';
import '../entities/submitted_report.dart';

abstract interface class ReportSubmissionRepository {
  Future<SubmittedReport> submitReport({
    required ReportSubmission submission,
    required String trackingCode,
    required ReportStatus status,
  });
}
