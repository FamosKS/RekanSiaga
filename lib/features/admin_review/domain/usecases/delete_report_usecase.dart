import '../repositories/report_admin_repository.dart';

class DeleteReportUseCase {
  const DeleteReportUseCase(this._repository);

  final ReportAdminRepository _repository;

  Future<void> execute(String reportId) async {
    final sanitizedReportId = reportId.trim();
    if (sanitizedReportId.isEmpty) {
      throw const FormatException('ID laporan tidak boleh kosong.');
    }

    await _repository.deleteReport(sanitizedReportId);
  }
}
