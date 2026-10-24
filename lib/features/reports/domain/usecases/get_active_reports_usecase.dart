import '../entities/active_report.dart';
import '../repositories/active_report_repository.dart';

class GetActiveReportsUseCase {
  const GetActiveReportsUseCase(this._repository);

  final ActiveReportRepository _repository;

  Future<List<ActiveReport>> execute() {
    return _repository.getActiveReports();
  }
}
