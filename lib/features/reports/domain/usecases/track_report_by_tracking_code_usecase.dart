import '../entities/report.dart';
import '../repositories/report_repository.dart';

class TrackReportByTrackingCodeUseCase {
  const TrackReportByTrackingCodeUseCase(this._repository);

  final ReportRepository _repository;

  Future<Report?> execute(String trackingCode) {
    final normalizedCode = trackingCode.trim();

    if (normalizedCode.isEmpty) {
      throw const FormatException('Tracking code tidak boleh kosong.');
    }

    return _repository.trackReportByTrackingCode(normalizedCode);
  }
}
