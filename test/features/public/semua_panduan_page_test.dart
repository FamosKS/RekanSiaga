import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rekansiaga/features/public/presentation/pages/panduan_siaga_page.dart';
import 'package:rekansiaga/features/public/presentation/pages/semua_panduan_page.dart';

void main() {
  const disasterTitles = [
    'Saat Gempa Terjadi',
    'Evakuasi Banjir',
    'Pencegahan Karhutla',
    'Siaga Erupsi Gunung',
    'Menghadapi Tsunami',
    'Waspada Tanah Longsor',
    'Antisipasi Puting Beliung',
    'Kesiapsiagaan Kekeringan',
  ];

  testWidgets('shows all disaster guides and opens the selected detail', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const MaterialApp(home: SemuaPanduanPage()));

    expect(find.text('Semua Panduan Bencana'), findsOneWidget);
    for (final title in disasterTitles) {
      expect(find.text(title), findsOneWidget);
    }

    await tester.tap(find.text('Menghadapi Tsunami'));
    await tester.pumpAndSettle();
    expect(find.text('Prabencana'), findsOneWidget);
    expect(
      find.text(
        'Ketahui tanda-tanda tsunami seperti gempa kuat, air laut surut, dan bunyi gemuruh',
      ),
      findsOneWidget,
    );
  });

  testWidgets('"Lihat semua" opens the all-guides page', (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: PanduanSiagaPage())),
    );

    await tester.tap(find.text('Lihat semua'));
    await tester.pumpAndSettle();

    expect(find.text('Semua Panduan Bencana'), findsOneWidget);
    for (final title in disasterTitles) {
      expect(find.text(title), findsOneWidget);
    }
  });
}
