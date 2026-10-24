import 'dart:math';

import '../entities/report_submission.dart';
import '../entities/report.dart';
import '../entities/submitted_report.dart';
import '../repositories/report_submission_repository.dart';

class SubmitReportUseCase {
  const SubmitReportUseCase(this._repository);

  final ReportSubmissionRepository _repository;

  Future<SubmittedReport> execute({
    required String title,
    required String description,
    required String reportType,
  }) async {
    final sanitizedTitle = title.trim();
    final sanitizedDescription = description.trim();
    final sanitizedReportType = reportType.trim();

    if (sanitizedTitle.isEmpty) {
      throw const FormatException('Judul laporan tidak boleh kosong.');
    }

    if (sanitizedDescription.isEmpty) {
      throw const FormatException('Deskripsi laporan tidak boleh kosong.');
    }

    if (sanitizedReportType.isEmpty) {
      throw const FormatException('Jenis laporan tidak boleh kosong.');
    }

    final submission = ReportSubmission(
      title: sanitizedTitle,
      description: sanitizedDescription,
      reportType: sanitizedReportType,
    );

    return _repository.submitReport(
      submission: submission,
      trackingCode: _generateTrackingCode(),
      status: ReportStatus.submitted,
    );
  }

  String _generateTrackingCode() {
    final timestamp = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
    final nonce = Random.secure().nextInt(1 << 32).toRadixString(36);
    return 'RPT-${timestamp.toUpperCase()}-${nonce.toUpperCase()}';
  }
}
