import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/accessibility/accessibility_settings.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: '.env');

  final supabaseUrl = dotenv.env['SUPABASE_URL']?.trim();
  final supabaseClientKey = dotenv.env['SUPABASE_PUBLISHABLE_KEY']?.trim();

  if (supabaseUrl == null || supabaseUrl.isEmpty) {
    throw StateError('Missing SUPABASE_URL in .env');
  }
  if (supabaseClientKey == null || supabaseClientKey.isEmpty) {
    throw StateError('Missing SUPABASE_PUBLISHABLE_KEY in .env');
  }

  await Supabase.initialize(
    url: supabaseUrl,
    publishableKey: supabaseClientKey,
  );

  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key, this.router});

  static final _router = createAppRouter(
    supabaseClient: Supabase.instance.client,
  );

  final GoRouter? router;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: isHighContrastNotifier,
      builder: (context, highContrast, _) {
        return ValueListenableBuilder<double>(
          valueListenable: fontSizeFactorNotifier,
          builder: (context, fontSizeFactor, _) {
            return MaterialApp.router(
              title: 'RekanSiaga',
              theme: highContrast ? ThemeData.dark() : AppTheme.light,
              darkTheme: AppTheme.dark,
              themeMode: highContrast ? ThemeMode.dark : ThemeMode.system,
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context)
                    .copyWith(textScaler: TextScaler.linear(fontSizeFactor)),
                child: child!,
              ),
              routerConfig: router ?? _router,
            );
          },
        );
      },
    );
  }
}
