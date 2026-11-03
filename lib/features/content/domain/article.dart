class Article {
  const Article({
    required this.id,
    required this.title,
    required this.slug,
    required this.summary,
    required this.content,
    required this.coverImagePath,
    required this.sourceUrl,
    required this.publicationStatus,
    required this.publishedAt,
    required this.createdAt,
    required this.updatedAt,
    required this.isFeatured,
  });

  factory Article.fromMap(Map<String, dynamic> map) {
    return Article(
      id: map['id']?.toString() ?? '',
      title: map['title']?.toString() ?? '',
      slug: map['slug']?.toString() ?? '',
      summary: map['summary']?.toString(),
      content: map['content']?.toString() ?? '',
      coverImagePath: map['cover_image_path']?.toString(),
      sourceUrl: map['source_url']?.toString(),
      publicationStatus: map['publication_status']?.toString() ?? 'published',
      publishedAt: _parseDate(map['published_at']),
      createdAt: _parseDate(map['created_at']),
      updatedAt: _parseDate(map['updated_at']),
      isFeatured: map['is_featured'] == true,
    );
  }

  final String id;
  final String title;
  final String slug;
  final String? summary;
  final String content;
  final String? coverImagePath;
  final String? sourceUrl;
  final String publicationStatus;
  final DateTime? publishedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final bool isFeatured;

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString())?.toLocal();
  }
}
