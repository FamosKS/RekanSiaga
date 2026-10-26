import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rekansiaga/features/public/presentation/pages/public_donation_page.dart';

void main() {
  Future<void> pumpDonationPage(WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: PublicDonationPage())),
    );
  }

  testWidgets('manual amount enforces the minimum donation', (tester) async {
    await pumpDonationPage(tester);

    final amountField = find.byType(TextFormField).last;
    await tester.enterText(amountField, '5000');
    await tester.pump();

    expect(find.text('Minimal donasi Rp 10.000'), findsOneWidget);
    expect(
      tester
          .widget<ElevatedButton>(
            find.widgetWithText(ElevatedButton, 'Lanjutkan'),
          )
          .onPressed,
      isNull,
    );

    await tester.enterText(amountField, '10000');
    await tester.pump();

    expect(find.text('Minimal donasi Rp 10.000'), findsNothing);
    expect(
      tester
          .widget<ElevatedButton>(
            find.widgetWithText(ElevatedButton, 'Lanjutkan'),
          )
          .onPressed,
      isNotNull,
    );
  });

  testWidgets('quick amount selection updates the manual amount field', (
    tester,
  ) async {
    await pumpDonationPage(tester);

    await tester.tap(find.byKey(const ValueKey('donation-amount-250000')));
    await tester.pump();

    final amountField = tester
        .widgetList<TextFormField>(find.byType(TextFormField))
        .last;
    expect(amountField.controller?.text, '250000');
  });

  testWidgets('payment options update the selected payment method', (
    tester,
  ) async {
    await pumpDonationPage(tester);

    await tester.ensureVisible(find.text('Transfer Bank'));
    await tester.tap(find.text('Transfer Bank'));
    await tester.pumpAndSettle();
    expect(find.text('BCA'), findsOneWidget);
    expect(find.text('Mandiri'), findsOneWidget);

    await tester.tap(find.text('BCA'));
    await tester.pumpAndSettle();
    expect(find.text('Transfer Bank'), findsOneWidget);
    expect(find.text('BCA'), findsOneWidget);

    await tester.ensureVisible(find.text('E-Wallet'));
    await tester.tap(find.text('E-Wallet'));
    await tester.pumpAndSettle();
    expect(find.text('GoPay'), findsOneWidget);
    expect(find.text('ShopeePay'), findsOneWidget);

    await tester.tap(find.text('ShopeePay'));
    await tester.pumpAndSettle();
    expect(find.text('ShopeePay'), findsOneWidget);
    expect(find.text('E-Wallet'), findsOneWidget);
  });
}
