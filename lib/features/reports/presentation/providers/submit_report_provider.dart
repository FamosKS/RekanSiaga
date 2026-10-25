import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../data/repositories/report_submission_repository_impl.dart';
import '../../domain/repositories/report_submission_repository.dart';
import '../../domain/usecases/submit_report_usecase.dart';

final reportSubmissionRepositoryProvider = Provider<ReportSubmissionRepository>(
  (ref) {
    return ReportSubmissionRepositoryImpl(Supabase.instance.client);
  },
);

final submitReportUseCaseProvider = Provider<SubmitReportUseCase>((ref) {
  return SubmitReportUseCase(ref.watch(reportSubmissionRepositoryProvider));
});

final submitReportControllerProvider =
    NotifierProvider<SubmitReportController, SubmitReportState>(
      SubmitReportController.new,
    );

enum SubmitReportStatus { idle, loading, success, error }

class SubmitReportState {
  const SubmitReportState({
    this.status = SubmitReportStatus.idle,
    this.errorMessage,
  });

  final SubmitReportStatus status;
  final String? errorMessage;
}

class SubmitReportController extends Notifier<SubmitReportState> {
  @override
  SubmitReportState build() => const SubmitReportState();

  Future<void> submit({
    required String title,
    required String description,
    required String reportType,
    double? latitude,
    double? longitude,
  }) async {
    state = const SubmitReportState(status: SubmitReportStatus.loading);

    try {
      await ref
          .read(submitReportUseCaseProvider)
          .execute(
            title: title,
            description: description,
            reportType: reportType,
            latitude: latitude,
            longitude: longitude,
          );
      state = const SubmitReportState(status: SubmitReportStatus.success);
    } on FormatException catch (error) {
      state = SubmitReportState(
        status: SubmitReportStatus.error,
        errorMessage: error.message,
      );
    } on Exception catch (error) {
      state = SubmitReportState(
        status: SubmitReportStatus.error,
        errorMessage: error.toString(),
      );
    }
  }

  void reset() {
    state = const SubmitReportState();
  }
}
