import '../../../reports/domain/entities/report.dart';
import '../entities/report_review.dart';
import '../repositories/report_admin_repository.dart';

class UpdateReportStatusUseCase {
  const UpdateReportStatusUseCase(this._repository);

  final ReportAdminRepository _repository;

  Future<ReportReview> execute({
    required String reportId,
    required ReportStatus newStatus,
    required String actorStaffId,
    String? note,
  }) async {
    final sanitizedReportId = reportId.trim();
    final sanitizedActorStaffId = actorStaffId.trim();

    if (sanitizedReportId.isEmpty) {
      throw const FormatException('ID laporan tidak boleh kosong.');
    }

    if (sanitizedActorStaffId.isEmpty) {
      throw const FormatException(
        'ID staf pengubah status tidak boleh kosong.',
      );
    }

    final currentReport = await _repository.getReportById(sanitizedReportId);

    if (currentReport.status == newStatus) {
      throw StateError('Laporan sudah berada pada status ${newStatus.name}.');
    }

    return _repository.updateReportStatus(
      reportId: sanitizedReportId,
      newStatus: newStatus,
      actorStaffId: sanitizedActorStaffId,
      note: note?.trim().isNotEmpty == true ? note!.trim() : null,
    );
  }
}
