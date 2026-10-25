import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:rekansiaga/features/public/presentation/widgets/disaster_warning_dialog.dart';

void main() {
  testWidgets('shows disaster warning details and closes from the dialog', (
    tester,
  ) async {
    final router = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => Scaffold(
            body: Center(
              child: TextButton(
                onPressed: () => showDisasterWarningDialog(context),
                child: const Text('Buka peringatan'),
              ),
            ),
          ),
        ),
      ],
    );

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.tap(find.text('Buka peringatan'));
    await tester.pumpAndSettle();

    expect(find.text('Peringatan Bencana Banjir Bandang'), findsOneWidget);
    expect(find.text('PERINGATAN BENCANA'), findsOneWidget);
    expect(find.textContaining('Kecamatan Koto Tangah'), findsOneWidget);
    expect(find.text('Rute Evakuasi'), findsOneWidget);

    await tester.tap(find.byTooltip('Tutup'));
    await tester.pumpAndSettle();

    expect(find.text('Peringatan Bencana Banjir Bandang'), findsNothing);
    router.dispose();
  });
}
