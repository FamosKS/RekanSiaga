// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:rekansiaga/core/routing/app_router.dart';
import 'package:rekansiaga/main.dart';

void main() {
  testWidgets('app opens on the public home page', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(child: MyApp(router: createAppRouter())),
    );
    await tester.pumpAndSettle();

    expect(find.text('Hi, RekanSiaga'), findsOneWidget);
    expect(find.text('Analisis Risiko Lokasi Saya'), findsOneWidget);
    expect(find.text('Berita Terbaru'), findsOneWidget);
    expect(find.text('Masuk Staf'), findsNothing);
    expect(
      find.text('You have pushed the button this many times:'),
      findsNothing,
    );
  });

  testWidgets('root route remains on the public main page', (
    WidgetTester tester,
  ) async {
    final router = createAppRouter();
    await tester.pumpWidget(
      ProviderScope(child: MaterialApp.router(routerConfig: router)),
    );
    await tester.pumpAndSettle();

    router.go(AppRoutes.root);
    await tester.pumpAndSettle();

    expect(find.text('Hi, RekanSiaga'), findsOneWidget);
    expect(router.routeInformationProvider.value.uri.path, AppRoutes.root);
    router.dispose();
  });

  testWidgets('SOS header opens the emergency page and back returns home', (
    tester,
  ) async {
    final router = createAppRouter();
    await tester.pumpWidget(
      ProviderScope(child: MaterialApp.router(routerConfig: router)),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Darurat (SOS)'));
    await tester.pumpAndSettle();

    expect(find.text('Pusat Darurat'), findsOneWidget);
    expect(find.text('Ambulans'), findsOneWidget);
    expect(find.text('119'), findsOneWidget);
    expect(find.text('Polisi'), findsOneWidget);
    expect(find.text('110'), findsOneWidget);
    expect(find.text('Pemadam Kebakaran'), findsOneWidget);
    expect(find.text('113'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('sos-back-button')));
    await tester.pumpAndSettle();

    expect(find.text('Hi, RekanSiaga'), findsOneWidget);
    expect(router.routeInformationProvider.value.uri.path, AppRoutes.root);
    router.dispose();
  });

  for (final protectedPath in [
    AppRoutes.dashboard,
    '/report-detail/report-1',
    AppRoutes.profile,
  ]) {
    testWidgets(
      'unauthenticated access to $protectedPath redirects to staff login',
      (tester) async {
        final router = createAppRouter();
        await tester.pumpWidget(
          ProviderScope(child: MaterialApp.router(routerConfig: router)),
        );
        await tester.pumpAndSettle();

        router.go(protectedPath);
        await tester.pumpAndSettle();

        expect(find.text('Masuk Staf'), findsOneWidget);
        expect(router.routeInformationProvider.value.uri.path, AppRoutes.login);
        router.dispose();
      },
    );
  }

  testWidgets('public navigation shows all five tabs', (tester) async {
    final router = createAppRouter();
    await tester.pumpWidget(
      ProviderScope(child: MaterialApp.router(routerConfig: router)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Beranda'), findsOneWidget);
    expect(find.text('Informasi'), findsOneWidget);
    expect(find.text('Peta'), findsOneWidget);
    expect(find.text('Lapor'), findsOneWidget);
    expect(find.text('Donasi'), findsOneWidget);

    final bottomNavigationBar = tester.widget<BottomNavigationBar>(
      find.byType(BottomNavigationBar),
    );
    expect(bottomNavigationBar.type, BottomNavigationBarType.fixed);

    await tester.tap(find.text('Informasi'));
    await tester.pumpAndSettle();
    expect(find.text('Pemantauan Terkini'), findsOneWidget);
    expect(find.text('Analisis Risiko Lokasi Saya'), findsNothing);
    expect(find.text('Terbaru'), findsOneWidget);
    expect(
      find.text('Cari berita bencana, lokasi, atau panduan...'),
      findsOneWidget,
    );
    expect(find.text('Awas'), findsOneWidget);
    expect(find.text('Siaga'), findsOneWidget);
    expect(find.text('Waspada'), findsOneWidget);
    expect(find.text('Lihat selengkapnya'), findsOneWidget);

    await tester.ensureVisible(find.text('Lihat selengkapnya'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lihat selengkapnya'));
    await tester.pumpAndSettle();
    expect(find.text('5 daerah memerlukan perhatian segera'), findsOneWidget);
    expect(find.text('3 daerah'), findsOneWidget);
    expect(find.text('Lihat di Peta'), findsNWidgets(2));
    expect(find.text('Mitigasi'), findsNWidgets(2));

    await tester.ensureVisible(find.text('Mitigasi').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Mitigasi').first);
    await tester.pumpAndSettle();
    expect(find.text('Panduan Siaga'), findsOneWidget);
    expect(find.text('Ceklis Tas Siaga Bencana Anda'), findsOneWidget);
    expect(find.text('Panduan Berdasarkan Bencana'), findsOneWidget);
    expect(find.text('Belajar Cepat'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('guide-back-button')));
    await tester.pumpAndSettle();
    expect(find.text('5 daerah memerlukan perhatian segera'), findsOneWidget);

    await tester.ensureVisible(
      find.byKey(const ValueKey('monitoring-back-button')),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('monitoring-back-button')));
    await tester.pumpAndSettle();
    expect(find.text('Pemantauan Terkini'), findsOneWidget);

    await tester.tap(find.text('Peta'));
    await tester.pumpAndSettle();
    expect(find.text('Peta RekanSiaga'), findsOneWidget);
    expect(
      find.text(
        'Area Peta Interaktif (Akan diintegrasikan dengan flutter_map atau google_maps_flutter)',
      ),
      findsOneWidget,
    );
    expect(find.text('Lapisan Peta'), findsOneWidget);
    expect(find.text('Tampilkan Relawan'), findsOneWidget);
    expect(find.text('Tampilkan Posko'), findsOneWidget);
    expect(find.text('Cek Risiko Lokasi Saya'), findsOneWidget);

    await tester.tap(find.text('Donasi'));
    await tester.pumpAndSettle();
    expect(
      find.text(
        'Berikan bantuan Anda dengan aman dan terpercaya untuk mendukung penanganan bencana.',
      ),
      findsOneWidget,
    );
    expect(find.text('Jumlah Donasi'), findsOneWidget);
    expect(find.text('Metode Pembayaran'), findsOneWidget);
    expect(find.text('Transfer Bank'), findsOneWidget);
    expect(find.text('E-Wallet'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('donation-amount-250000')));
    await tester.pumpAndSettle();
    final eWalletOption = find.byKey(const ValueKey('payment-method-eWallet'));
    await tester.ensureVisible(eWalletOption);
    await tester.pumpAndSettle();
    await tester.tap(eWalletOption);
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.check_circle), findsOneWidget);

    await tester.ensureVisible(find.byType(Checkbox));
    await tester.pumpAndSettle();
    final agreementCheckbox = tester.widget<Checkbox>(find.byType(Checkbox));
    expect(agreementCheckbox.value, isFalse);
    await tester.tap(find.byType(Checkbox));
    await tester.pumpAndSettle();
    expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isTrue);

    await tester.ensureVisible(find.text('Submit'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Submit'));
    await tester.pumpAndSettle();
    expect(
      find.text('Simulasi donasi belum terhubung ke pembayaran.'),
      findsOneWidget,
    );

    await tester.tap(find.text('Lapor'));
    await tester.pumpAndSettle();
    expect(find.text('Laporan Kejadian'), findsOneWidget);
    router.dispose();
  });

  testWidgets('public submit-report route can be opened without staff login', (
    tester,
  ) async {
    final router = createAppRouter();
    await tester.pumpWidget(
      ProviderScope(child: MaterialApp.router(routerConfig: router)),
    );
    await tester.pumpAndSettle();

    router.go(AppRoutes.submitReport);
    await tester.pumpAndSettle();

    expect(find.text('Laporan Kejadian'), findsOneWidget);
    expect(
      router.routeInformationProvider.value.uri.path,
      AppRoutes.submitReport,
    );
    router.dispose();
  });
}
