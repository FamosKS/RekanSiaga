import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rekansiaga/features/public/presentation/pages/ceklis_tas_siaga_page.dart';

void main() {
  Future<void> pumpChecklistPage(WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const MaterialApp(home: CeklisTasSiagaPage()));
  }

  testWidgets('checklist starts at zero and updates progress when checked', (
    tester,
  ) async {
    await pumpChecklistPage(tester);

    expect(find.text('Kesiapan Tas Siaga Anda: 0%'), findsOneWidget);
    expect(find.byType(CheckboxListTile), findsNWidgets(9));

    await tester.tap(find.byType(CheckboxListTile).first);
    await tester.pump();

    expect(find.text('Kesiapan Tas Siaga Anda: 11%'), findsOneWidget);
    expect(
      tester
          .widget<CheckboxListTile>(find.byType(CheckboxListTile).first)
          .value,
      isTrue,
    );
  });

  testWidgets('all checklist items complete the progress indicator', (
    tester,
  ) async {
    await pumpChecklistPage(tester);

    for (var index = 0; index < 9; index++) {
      await tester.tap(find.byType(CheckboxListTile).at(index));
      await tester.pump();
    }

    expect(find.text('Kesiapan Tas Siaga Anda: 100%'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 400));
    expect(
      tester
          .widget<LinearProgressIndicator>(find.byType(LinearProgressIndicator))
          .color,
      const Color(0xFFB84E00),
    );
  });
}
