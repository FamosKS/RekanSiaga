import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rekansiaga/features/admin_review/domain/entities/report_review.dart';
import 'package:rekansiaga/features/admin_review/domain/repositories/report_admin_repository.dart';
import 'package:rekansiaga/features/admin_review/presentation/pages/report_detail_page.dart';
import 'package:rekansiaga/features/admin_review/presentation/providers/report_review_provider.dart';
import 'package:rekansiaga/features/reports/domain/entities/report.dart';

void main() {
  testWidgets('shows report details and updates status through use case', (
    tester,
  ) async {
    final repository = _FakeReportAdminRepository();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          reportAdminRepositoryProvider.overrideWithValue(repository),
          currentStaffIdProvider.overrideWithValue('staff-1'),
        ],
        child: const MaterialApp(home: ReportDetailPage(reportId: 'report-1')),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Banjir'), findsOneWidget);
    expect(find.text('Genangan di wilayah utara'), findsOneWidget);
    expect(find.text('Bencana alam'), findsOneWidget);
    expect(find.textContaining('RPT-123'), findsOneWidget);
    expect(find.text('Dikirim'), findsOneWidget);

    await tester.tap(find.text('Dalam Peninjauan'));
    await tester.pumpAndSettle();

    expect(repository.updatedStatus, ReportStatus.underReview);
    expect(repository.actorStaffId, 'staff-1');
    expect(find.text('Status laporan berhasil diperbarui'), findsOneWidget);
    expect(find.text('Dalam Peninjauan'), findsWidgets);
  });

  testWidgets('shows a snackbar when updating status fails', (tester) async {
    final repository = _FakeReportAdminRepository(failUpdate: true);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          reportAdminRepositoryProvider.overrideWithValue(repository),
          currentStaffIdProvider.overrideWithValue('staff-1'),
        ],
        child: const MaterialApp(home: ReportDetailPage(reportId: 'report-1')),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Disetujui'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Update ditolak'), findsOneWidget);
  });

  testWidgets('deletes report after confirmation', (tester) async {
    final repository = _FakeReportAdminRepository();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          reportAdminRepositoryProvider.overrideWithValue(repository),
          currentStaffIdProvider.overrideWithValue('staff-1'),
        ],
        child: const MaterialApp(
          home: Scaffold(body: ReportDetailPage(reportId: 'report-1')),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Hapus laporan'));
    await tester.pumpAndSettle();
    expect(find.text('Hapus laporan?'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Hapus'));
    await tester.pumpAndSettle();

    expect(repository.deletedReportId, 'report-1');
  });

  testWidgets('shows a snackbar when deleting report fails', (tester) async {
    final repository = _FakeReportAdminRepository(failDelete: true);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          reportAdminRepositoryProvider.overrideWithValue(repository),
          currentStaffIdProvider.overrideWithValue('staff-1'),
        ],
        child: const MaterialApp(home: ReportDetailPage(reportId: 'report-1')),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Hapus laporan'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Hapus'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Delete ditolak'), findsOneWidget);
  });
}

class _FakeReportAdminRepository implements ReportAdminRepository {
  _FakeReportAdminRepository({
    this.failUpdate = false,
    this.failDelete = false,
  });

  final bool failUpdate;
  final bool failDelete;
  ReportStatus status = ReportStatus.submitted;
  ReportStatus? updatedStatus;
  String? actorStaffId;
  String? deletedReportId;

  ReportReview _report() {
    return ReportReview(
      id: 'report-1',
      trackingCode: 'RPT-123',
      title: 'Banjir',
      description: 'Genangan di wilayah utara',
      reportType: 'Bencana alam',
      status: status,
      createdAt: DateTime(2026, 10, 22, 9, 5),
    );
  }

  @override
  Future<ReportReview> getReportById(String reportId) async => _report();

  @override
  Future<void> deleteReport(String reportId) async {
    if (failDelete) {
      throw StateError('Delete ditolak oleh backend.');
    }
    deletedReportId = reportId;
  }

  @override
  Future<ReportReview> updateReportStatus({
    required String reportId,
    required ReportStatus newStatus,
    required String actorStaffId,
    String? note,
  }) async {
    if (failUpdate) {
      throw StateError('Update ditolak oleh backend.');
    }
    updatedStatus = newStatus;
    this.actorStaffId = actorStaffId;
    status = newStatus;
    return _report();
  }
}
