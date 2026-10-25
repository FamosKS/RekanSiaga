import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../reports/domain/entities/report.dart';
import '../../data/repositories/report_admin_repository_impl.dart';
import '../../domain/entities/report_review.dart';
import '../../domain/repositories/report_admin_repository.dart';
import '../../domain/usecases/delete_report_usecase.dart';
import '../../domain/usecases/update_report_status_usecase.dart';

final reportAdminRepositoryProvider = Provider<ReportAdminRepository>((ref) {
  return ReportAdminRepositoryImpl(Supabase.instance.client);
});

final updateReportStatusUseCaseProvider = Provider<UpdateReportStatusUseCase>((
  ref,
) {
  return UpdateReportStatusUseCase(ref.watch(reportAdminRepositoryProvider));
});

final deleteReportUseCaseProvider = Provider<DeleteReportUseCase>((ref) {
  return DeleteReportUseCase(ref.watch(reportAdminRepositoryProvider));
});

final currentStaffIdProvider = Provider<String?>((ref) {
  return Supabase.instance.client.auth.currentUser?.id;
});

final reportReviewProvider = FutureProvider.family<ReportReview, String>((
  ref,
  reportId,
) {
  return ref.watch(reportAdminRepositoryProvider).getReportById(reportId);
});

final updateReportStatusControllerProvider =
    NotifierProvider<UpdateReportStatusController, UpdateReportStatusState>(
      UpdateReportStatusController.new,
    );

enum DeleteReportStatus { idle, loading, success, error }

class DeleteReportState {
  const DeleteReportState({
    this.status = DeleteReportStatus.idle,
    this.errorMessage,
  });

  final DeleteReportStatus status;
  final String? errorMessage;
}

final deleteReportControllerProvider =
    NotifierProvider<DeleteReportController, DeleteReportState>(
      DeleteReportController.new,
    );

class DeleteReportController extends Notifier<DeleteReportState> {
  @override
  DeleteReportState build() => const DeleteReportState();

  Future<void> delete(String reportId) async {
    state = const DeleteReportState(status: DeleteReportStatus.loading);

    try {
      await ref.read(deleteReportUseCaseProvider).execute(reportId);
      state = const DeleteReportState(status: DeleteReportStatus.success);
    } catch (error) {
      state = DeleteReportState(
        status: DeleteReportStatus.error,
        errorMessage: error.toString(),
      );
    }
  }

  void reset() {
    state = const DeleteReportState();
  }
}

enum ReportStatusUpdateState { idle, loading, success, error }

class UpdateReportStatusState {
  const UpdateReportStatusState({
    this.status = ReportStatusUpdateState.idle,
    this.report,
    this.errorMessage,
  });

  final ReportStatusUpdateState status;
  final ReportReview? report;
  final String? errorMessage;
}

class UpdateReportStatusController extends Notifier<UpdateReportStatusState> {
  @override
  UpdateReportStatusState build() => const UpdateReportStatusState();

  Future<void> update({
    required String reportId,
    required ReportStatus newStatus,
  }) async {
    state = const UpdateReportStatusState(
      status: ReportStatusUpdateState.loading,
    );

    try {
      final actorStaffId = ref.read(currentStaffIdProvider);
      if (actorStaffId == null || actorStaffId.trim().isEmpty) {
        throw StateError('Sesi staf tidak ditemukan. Silakan login kembali.');
      }

      final report = await ref
          .read(updateReportStatusUseCaseProvider)
          .execute(
            reportId: reportId,
            newStatus: newStatus,
            actorStaffId: actorStaffId,
          );
      state = UpdateReportStatusState(
        status: ReportStatusUpdateState.success,
        report: report,
      );
    } catch (error) {
      state = UpdateReportStatusState(
        status: ReportStatusUpdateState.error,
        errorMessage: error.toString(),
      );
    }
  }

  void reset() {
    state = const UpdateReportStatusState();
  }
}
