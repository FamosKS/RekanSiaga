import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:rekansiaga/core/routing/app_router.dart';
import 'package:rekansiaga/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:rekansiaga/features/dashboard/presentation/providers/active_reports_provider.dart';
import 'package:rekansiaga/features/dashboard/presentation/widgets/report_card.dart';
import 'package:rekansiaga/features/reports/domain/entities/active_report.dart';

void main() {
  testWidgets('shows active reports and bottom navigation', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          activeReportsProvider.overrideWith(
            (ref) async => [
              ActiveReport(
                id: 'report-1',
                trackingCode: 'RPT-123',
                title: 'Banjir',
                description: 'Genangan di wilayah utara',
                status: 'submitted',
                createdAt: DateTime(2026, 10, 22, 9, 5),
              ),
            ],
          ),
        ],
        child: const MaterialApp(home: DashboardPage()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('RekanSiaga'), findsOneWidget);
    expect(find.text('Banjir'), findsOneWidget);
    expect(find.textContaining('RPT-123'), findsOneWidget);
    expect(find.byType(BottomNavigationBar), findsOneWidget);
    expect(find.text('Beranda'), findsOneWidget);
    expect(find.text('Panduan'), findsOneWidget);
    expect(find.text('Darurat'), findsOneWidget);

    await tester.tap(find.text('Darurat'));
    await tester.pump();

    final navigationBar = tester.widget<BottomNavigationBar>(
      find.byType(BottomNavigationBar),
    );
    expect(navigationBar.currentIndex, 2);
  });

  testWidgets('report card shows formatted date and themed status badge', (
    tester,
  ) async {
    final report = ActiveReport(
      id: 'report-1',
      trackingCode: 'RPT-123',
      title: 'Banjir',
      description:
          'Genangan air meluas ke beberapa ruas jalan dan area permukiman.',
      status: 'under_review',
      createdAt: DateTime(2026, 10, 22, 9, 5),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF087E8B)),
        ),
        home: Scaffold(
          body: ReportCard(report: report, onTap: () {}),
        ),
      ),
    );

    expect(find.text('22 Okt 2026, 09:05'), findsOneWidget);
    expect(find.text('Ditinjau'), findsOneWidget);
    expect(find.byType(Card), findsOneWidget);
    expect(tester.widget<Text>(find.text(report.description)).maxLines, 2);
  });

  testWidgets('shows loading, empty, and error states', (tester) async {
    final completer = Completer<List<ActiveReport>>();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          activeReportsProvider.overrideWith((ref) => completer.future),
        ],
        child: const MaterialApp(home: DashboardPage()),
      ),
    );
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    completer.complete(const []);
    await tester.pumpAndSettle();
    expect(find.text('Belum ada kejadian/laporan saat ini'), findsOneWidget);

    await tester.pumpWidget(
      ProviderScope(
        key: const ValueKey('error-state'),
        overrides: [
          activeReportsProvider.overrideWith(
            (ref) => Future<List<ActiveReport>>.error(Exception('offline')),
          ),
        ],
        child: const MaterialApp(home: DashboardPage()),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('Gagal memuat laporan'), findsOneWidget);
    expect(find.textContaining('offline'), findsOneWidget);
  });

  testWidgets('FAB navigates to the submit report route', (tester) async {
    final router = GoRouter(
      initialLocation: AppRoutes.dashboard,
      routes: [
        GoRoute(
          path: AppRoutes.dashboard,
          builder: (context, state) => const DashboardPage(),
        ),
        GoRoute(
          path: AppRoutes.submitReport,
          builder: (context, state) =>
              const Scaffold(body: Text('Form laporan placeholder')),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          activeReportsProvider.overrideWith((ref) async => const []),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Buat laporan'));
    await tester.pumpAndSettle();

    expect(find.text('Form laporan placeholder'), findsOneWidget);
    expect(
      router.routeInformationProvider.value.uri.path,
      AppRoutes.submitReport,
    );
    router.dispose();
  });

  testWidgets('tapping a report opens its detail route', (tester) async {
    final router = GoRouter(
      initialLocation: AppRoutes.dashboard,
      routes: [
        GoRoute(
          path: AppRoutes.dashboard,
          builder: (context, state) => const DashboardPage(),
        ),
        GoRoute(
          name: AppRoutes.reportDetailName,
          path: AppRoutes.reportDetailPath,
          builder: (context, state) => Scaffold(
            body: Text('Detail ${state.pathParameters['reportId']}'),
          ),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          activeReportsProvider.overrideWith(
            (ref) async => [
              ActiveReport(
                id: 'report-42',
                trackingCode: 'RPT-42',
                title: 'Banjir',
                description: 'Laporan wilayah utara',
                status: 'submitted',
                createdAt: DateTime(2026, 10, 22, 9, 5),
              ),
            ],
          ),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Banjir'));
    await tester.pumpAndSettle();

    expect(find.text('Detail report-42'), findsOneWidget);
    router.dispose();
  });
}
