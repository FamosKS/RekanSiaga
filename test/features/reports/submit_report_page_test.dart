import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:rekansiaga/features/reports/domain/entities/report.dart';
import 'package:rekansiaga/features/reports/domain/entities/report_submission.dart';
import 'package:rekansiaga/features/reports/domain/entities/submitted_report.dart';
import 'package:rekansiaga/features/reports/domain/repositories/report_submission_repository.dart';
import 'package:rekansiaga/features/reports/presentation/pages/submit_report_page.dart';
import 'package:rekansiaga/features/reports/presentation/providers/submit_report_provider.dart';

void main() {
  testWidgets('validates required fields and submits report', (tester) async {
    final repository = _FakeReportSubmissionRepository();
    final router = _createRouter();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          reportSubmissionRepositoryProvider.overrideWithValue(repository),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Buka form laporan'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Submit'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Submit'));
    await tester.pumpAndSettle();

    expect(find.text('Judul wajib diisi.'), findsOneWidget);
    expect(find.text('Jenis laporan wajib diisi.'), findsOneWidget);
    expect(find.text('Deskripsi wajib diisi.'), findsOneWidget);
    expect(repository.submission, isNull);

    await tester.enterText(
      find.byKey(const ValueKey('report-title-field')),
      ' Banjir ',
    );
    await tester.enterText(
      find.byKey(const ValueKey('report-type-field')),
      ' banjir ',
    );
    await tester.enterText(
      find.byKey(const ValueKey('report-description-field')),
      ' Kondisi parah ',
    );
    await tester.ensureVisible(find.text('Submit'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Submit'));
    await tester.pumpAndSettle();

    expect(repository.submission?.title, 'Banjir');
    expect(repository.submission?.reportType, 'banjir');
    expect(repository.submission?.description, 'Kondisi parah');
    expect(repository.status, ReportStatus.submitted);
    expect(repository.trackingCode, startsWith('RPT-'));
    expect(find.text('Buka form laporan'), findsOneWidget);
    expect(find.text('Laporan berhasil dikirim'), findsOneWidget);
    router.dispose();
  });

  testWidgets('shows loading and error for failed submissions', (tester) async {
    final completer = Completer<SubmittedReport>();
    final repository = _FakeReportSubmissionRepository(
      result: completer.future,
    );
    final router = _createRouter();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          reportSubmissionRepositoryProvider.overrideWithValue(repository),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Buka form laporan'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('report-title-field')),
      'Banjir',
    );
    await tester.enterText(
      find.byKey(const ValueKey('report-type-field')),
      'banjir',
    );
    await tester.enterText(
      find.byKey(const ValueKey('report-description-field')),
      'Air meningkat',
    );
    await tester.ensureVisible(find.text('Submit'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Submit'));
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    completer.completeError(Exception('server unavailable'));
    await tester.pumpAndSettle();
    expect(find.textContaining('server unavailable'), findsOneWidget);
    expect(find.byType(SubmitReportPage), findsOneWidget);
    router.dispose();
  });
}

GoRouter _createRouter() {
  return GoRouter(
    initialLocation: '/dashboard',
    routes: [
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () => context.push('/submit-report'),
              child: const Text('Buka form laporan'),
            ),
          ),
        ),
      ),
      GoRoute(
        path: '/submit-report',
        builder: (context, state) => const SubmitReportPage(),
      ),
    ],
  );
}

class _FakeReportSubmissionRepository implements ReportSubmissionRepository {
  _FakeReportSubmissionRepository({this.result});

  final Future<SubmittedReport>? result;
  ReportSubmission? submission;
  ReportStatus? status;
  String? trackingCode;

  @override
  Future<SubmittedReport> submitReport({
    required ReportSubmission submission,
    required String trackingCode,
    required ReportStatus status,
  }) {
    this.submission = submission;
    this.trackingCode = trackingCode;
    this.status = status;
    return result ??
        Future.value(
          SubmittedReport(
            id: 'report-id',
            trackingCode: trackingCode,
            title: submission.title,
            description: submission.description,
            reportType: submission.reportType,
            status: status,
          ),
        );
  }
}
