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
}

class _FakeReportAdminRepository implements ReportAdminRepository {
  _FakeReportAdminRepository({this.failUpdate = false});

  final bool failUpdate;
  ReportStatus status = ReportStatus.submitted;
  ReportStatus? updatedStatus;
  String? actorStaffId;

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
