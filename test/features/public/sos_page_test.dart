import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rekansiaga/features/public/presentation/pages/sos_page.dart';

void main() {
  testWidgets('SOS page separates relay status from official channels', (
    tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: SosPage()));
    await tester.pumpAndSettle();

    expect(find.text('Pusat Darurat'), findsOneWidget);
    expect(find.text('Jalur layanan resmi'), findsOneWidget);
    expect(find.textContaining('backend SOS'), findsOneWidget);
    expect(find.text('Ambulans / Medis'), findsOneWidget);
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pump();
    expect(find.text('Kepolisian'), findsOneWidget);
  });
}
