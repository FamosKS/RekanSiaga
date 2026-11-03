import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/article.dart';

class ArticleRepository {
  ArticleRepository({SupabaseClient? client}) : _supabaseClient = client;

  final SupabaseClient? _supabaseClient;
  static const articleColumns =
      'id,title,slug,summary,content,cover_image_path,source_url,'
      'publication_status,published_at,created_at,updated_at';

  SupabaseClient get client => _supabaseClient ?? Supabase.instance.client;

  Future<List<Article>> publishedPage({
    int page = 1,
    int pageSize = 20,
    String? titleSearch,
  }) async {
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      throw ArgumentError('Invalid article page');
    }
    final start = (page - 1) * pageSize;
    var query = client
        .from('articles')
        .select(articleColumns)
        .eq('publication_status', 'published')
        .not('published_at', 'is', null);
    final term = titleSearch?.trim();
    if (term != null && term.isNotEmpty) {
      if (term.length > 120) throw ArgumentError('Search is too long');
      final literal = term.replaceAll(RegExp(r'[\\%_]'), r'\\$0');
      query = query.ilike('title', '%$literal%');
    }
    final rows = await query
        .order('published_at', ascending: false)
        .order('id', ascending: true)
        .range(start, start + pageSize - 1);
    return rows
        .map((row) => Article.fromMap(Map<String, dynamic>.from(row)))
        .where((article) => article.publicationStatus == 'published')
        .toList();
  }

  Future<Article?> bySlug(String slug) async {
    final row = await client
        .from('articles')
        .select(articleColumns)
        .eq('slug', slug)
        .eq('publication_status', 'published')
        .not('published_at', 'is', null)
        .maybeSingle();
    if (row == null) return null;
    final article = Article.fromMap(Map<String, dynamic>.from(row));
    return article.publicationStatus == 'published' ? article : null;
  }

  Future<Article?> featured() async {
    final result = await client.rpc('public_home_featured_article_v1');
    final rows = List<Map<String, dynamic>>.from(result as List);
    if (rows.isEmpty) return null;
    final article = Article.fromMap(rows.first);
    return article.publicationStatus == 'published' ? article : null;
  }

  Uri coverUri(String slug) {
    final supabaseUrl = dotenv.env['SUPABASE_URL']?.trim() ?? '';
    if (supabaseUrl.isEmpty) {
      throw StateError('Missing SUPABASE_URL in .env');
    }
    return Uri.parse(
      '$supabaseUrl/functions/v1/public-article-cover'
      '?slug=${Uri.encodeQueryComponent(slug)}',
    );
  }
}
