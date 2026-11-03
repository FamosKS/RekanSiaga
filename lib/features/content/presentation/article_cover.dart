import 'package:flutter/material.dart';

import '../../content/domain/article.dart';
import '../data/article_repository.dart';

class ArticleCover extends StatelessWidget {
  const ArticleCover({
    super.key,
    required this.article,
    required this.repository,
    this.height,
    this.width,
  });

  final Article article;
  final ArticleRepository repository;
  final double? height;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final path = article.coverImagePath?.trim();
    if (path == null || path.isEmpty) return _placeholder();
    if (path.startsWith('https://') || path.startsWith('http://')) {
      final uri = Uri.tryParse(path);
      if (uri == null || (uri.scheme != 'https' && uri.scheme != 'http')) {
        return _placeholder();
      }
      return Image.network(
        uri.toString(),
        height: height,
        width: width,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => _placeholder(),
      );
    }
    if (!path.startsWith('article-media/')) return _placeholder();
    return Image.network(
      repository.coverUri(article.slug).toString(),
      height: height,
      width: width,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => _placeholder(),
    );
  }

  Widget _placeholder() {
    return SizedBox(
      height: height,
      width: width,
      child: Container(
        color: const Color(0xFFF1F5F9),
        alignment: Alignment.center,
        child: const Icon(Icons.article_outlined, color: Color(0xFF64748B)),
      ),
    );
  }
}
