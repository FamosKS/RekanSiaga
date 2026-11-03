// dart run integration/flutter/read_dev.dart integration/flutter/dev.local.json
// GET only; config/key and row contents are never printed.
import 'dart:convert';
import 'dart:io';
import 'rekansiaga_public_api.dart';

Future<void> main(List<String> args) async {
  if (args.length != 1) throw ArgumentError('Supply the private dev JSON config path.');
  final input = jsonDecode(await File(args.single).readAsString()) as Map<String, dynamic>;
  final api = RekansiagaPublicApi(RekansiagaConfig(input['SUPABASE_URL'] as String, input['SUPABASE_PUBLISHABLE_KEY'] as String));
  try {
    final articles = await api.publishedArticles();
    final guides = await api.publishedGuides();
    stdout.writeln(jsonEncode({'projectRef': devProjectRef, 'transport': 'Dart native GET', 'articles': articles.length, 'guides': guides.length, 'remoteWrites': 0, 'flutterAppTested': false}));
  } finally { api.close(); }
}
