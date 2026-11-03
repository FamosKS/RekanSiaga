import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rekansiaga/features/public/presentation/pages/panduan_siaga_page.dart';

void main() {
  Future<void> pumpGuidePage(WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: PanduanSiagaPage())),
    );
  }

  testWidgets('emergency bag card opens the checklist page', (tester) async {
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await pumpGuidePage(tester);

    expect(find.text('0% Selesai'), findsOneWidget);
    await tester.tap(find.text('Ceklis Tas Siaga Bencana Anda'));
    await tester.pumpAndSettle();

    expect(find.text('Tas Siaga'), findsOneWidget);
    expect(find.byType(ListView), findsOneWidget);
    await tester.tap(find.byType(CheckboxListTile).first);
    await tester.tap(find.text('Simpan & Selesai'));
    await tester.pumpAndSettle();

    expect(find.text('11% Selesai'), findsOneWidget);
  });

  testWidgets('disaster guide card opens a detail page with its title', (
    tester,
  ) async {
    await pumpGuidePage(tester);

    await tester.ensureVisible(find.text('Saat Gempa Terjadi'));
    await tester.tap(find.text('Saat Gempa Terjadi'));
    await tester.pumpAndSettle();

    expect(find.text('Saat Gempa Terjadi'), findsOneWidget);
    expect(find.byType(AppBar), findsOneWidget);
  });
}
