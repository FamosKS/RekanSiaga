import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/article_repository.dart';
import '../domain/article.dart';
import 'article_cover.dart';

class ArticleDetailPage extends StatefulWidget {
  const ArticleDetailPage({super.key, required this.slug});

  final String slug;

  @override
  State<ArticleDetailPage> createState() => _ArticleDetailPageState();
}

class _ArticleDetailPageState extends State<ArticleDetailPage> {
  final _repository = ArticleRepository();
  late Future<Article?> _article = _repository.bySlug(widget.slug);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E293B),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Detail Informasi',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontWeight: FontWeight.w700,
          ),
        ),
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: const Icon(Icons.arrow_back_ios_new),
          color: const Color(0xFF1E293B),
          tooltip: 'Kembali',
        ),
      ),
      body: FutureBuilder<Article?>(
        future: _article,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: Color(0xFFF57C00)),
            );
          }
          if (snapshot.hasError) {
            return _state(
              'Konten tidak dapat dimuat',
              'Periksa koneksi internet lalu coba kembali.',
              () => setState(() => _article = _repository.bySlug(widget.slug)),
            );
          }
          final article = snapshot.data;
          if (article == null) {
            return _state(
              'Artikel tidak ditemukan',
              'Artikel mungkin belum dipublikasikan atau sudah diarsipkan.',
              null,
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              setState(() => _article = _repository.bySlug(widget.slug));
              await _article;
            },
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: ArticleCover(
                    article: article,
                    repository: _repository,
                    height: 220,
                    width: double.infinity,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  article.title,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E293B),
                    height: 1.25,
                  ),
                ),
                if (article.publishedAt != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Dipublikasikan ${_formatDate(article.publishedAt!)}',
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
                if (article.summary != null &&
                    article.summary!.trim().isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(
                    article.summary!,
                    style: const TextStyle(
                      fontSize: 15,
                      fontStyle: FontStyle.italic,
                      color: Color(0xFF475569),
                      height: 1.5,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Divider(color: Colors.grey.shade200),
                const SizedBox(height: 16),
                Text(
                  article.content,
                  style: const TextStyle(
                    fontSize: 16,
                    height: 1.6,
                    color: Color(0xFF334155),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _state(String title, String message, VoidCallback? retry) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            if (retry != null) ...[
              const SizedBox(height: 12),
              FilledButton(onPressed: retry, child: const Text('Coba lagi')),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}
