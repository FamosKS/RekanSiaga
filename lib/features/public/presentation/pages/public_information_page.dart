import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../content/data/article_repository.dart';
import '../../../content/domain/article.dart';
import '../../../content/presentation/article_cover.dart';

class PublicInformationPage extends StatefulWidget {
  const PublicInformationPage({
    super.key,
    required this.onOpenMap,
    required this.onOpenEmergency,
    required this.onOpenMonitoring,
  });

  final VoidCallback onOpenMap;
  final VoidCallback onOpenEmergency;
  final VoidCallback onOpenMonitoring;

  @override
  State<PublicInformationPage> createState() => _PublicInformationPageState();
}

class _PublicInformationPageState extends State<PublicInformationPage> {
  static const _categories = [
    _InformationCategory(label: 'Terbaru', icon: null),
    _InformationCategory(label: 'Banjir', icon: Icons.flood_outlined),
    _InformationCategory(label: 'Gempa', icon: Icons.monitor_heart_outlined),
    _InformationCategory(label: 'Karhutla', icon: Icons.local_fire_department),
  ];

  int _selectedCategory = 0;
  final _repository = ArticleRepository();
  final _searchController = TextEditingController();
  List<Article> _articles = const [];
  bool _loading = true;
  Object? _error;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadArticles();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadArticles() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final articles = await _repository.publishedPage(
        pageSize: 20,
        titleSearch: _search,
      );
      if (!mounted) return;
      setState(() {
        _articles = articles;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.grey[50]!,
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _InformationHeader(onEmergencyTap: widget.onOpenEmergency),
              const SizedBox(height: 14),
              _InformationSearchBar(
                controller: _searchController,
                onChanged: (value) {
                  _search = value;
                },
                onSubmitted: (_) => _loadArticles(),
              ),
              const SizedBox(height: 12),
              _CategoryChips(
                categories: _categories,
                selectedIndex: _selectedCategory,
                onSelected: (index) => setState(() {
                  _selectedCategory = index;
                }),
              ),
              const SizedBox(height: 12),
              FutureBuilder<Article?>(
                future: _repository.featured(),
                builder: (context, snapshot) {
                  final article = snapshot.data;
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const _FeaturedStoryLoading();
                  }
                  if (snapshot.hasError || article == null) {
                    return const _FeaturedStoryEmpty();
                  }
                  return _FeaturedStory(
                    article: article,
                    repository: _repository,
                  );
                },
              ),
              const SizedBox(height: 14),
              Text(
                'Pemantauan Terkini',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: const Color(0xFF172033),
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _MonitoringCard(
                      title: 'Awas',
                      count: '-',
                      icon: Icons.warning_rounded,
                      accent: const Color(0xFFDC3545),
                      tint: const Color(0xFFFFE3E5),
                      onTap: widget.onOpenMap,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _MonitoringCard(
                      title: 'Siaga',
                      count: '-',
                      icon: Icons.notifications_active_rounded,
                      accent: const Color(0xFFB84E00),
                      tint: const Color(0xFFFFECD8),
                      onTap: widget.onOpenMap,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _MonitoringCard(
                      title: 'Waspada',
                      count: '-',
                      icon: Icons.visibility_rounded,
                      accent: const Color(0xFF14805E),
                      tint: const Color(0xFFE4F8EF),
                      onTap: widget.onOpenMap,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: widget.onOpenMonitoring,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFB84E00),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    minimumSize: const Size.fromHeight(40),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    textStyle: Theme.of(context).textTheme.labelLarge
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  child: const Text('Lihat selengkapnya'),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Artikel',
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              _buildArticleContent(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildArticleContent(BuildContext context) {
    if (_loading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child: CircularProgressIndicator(color: Color(0xFFF57C00)),
        ),
      );
    }
    if (_error != null) {
      return _ArticleState(
        icon: Icons.cloud_off_outlined,
        title: 'Artikel tidak dapat dimuat',
        message: 'Periksa koneksi internet lalu coba kembali.',
        onRetry: _loadArticles,
      );
    }
    if (_articles.isEmpty) {
      return const _ArticleState(
        icon: Icons.article_outlined,
        title: 'Belum ada artikel',
        message: 'Artikel yang dipublikasikan akan tampil di sini.',
      );
    }
    return Column(
      children: [
        for (final article in _articles)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: InkWell(
              onTap: () => context.push('/article/${article.slug}'),
              borderRadius: BorderRadius.circular(14),
              child: Ink(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(14),
                      ),
                      child: ArticleCover(
                        article: article,
                        repository: _repository,
                        height: 150,
                        width: double.infinity,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            article.title,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          if (article.summary?.trim().isNotEmpty == true) ...[
                            const SizedBox(height: 6),
                            Text(
                              article.summary!,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Color(0xFF64748B),
                                height: 1.35,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _InformationHeader extends StatelessWidget {
  const _InformationHeader({required this.onEmergencyTap});

  final VoidCallback onEmergencyTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Center(
            child: Image.asset(
              'assets/images/Logo.png',
              width: 32,
              height: 32,
              fit: BoxFit.contain,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Sistem Siaga',
                style: textTheme.labelSmall?.copyWith(
                  color: Colors.blueGrey[600],
                ),
              ),
              Text(
                'RekanSiaga',
                style: textTheme.titleLarge?.copyWith(
                  color: const Color(0xFF172033),
                  fontWeight: FontWeight.w800,
                  height: 1.05,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        ElevatedButton.icon(
          onPressed: onEmergencyTap,
          icon: const Icon(Icons.notifications_active_outlined, size: 14),
          label: const Text('Darurat (SOS)'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFD34B3B),
            foregroundColor: Colors.white,
            elevation: 0,
            minimumSize: const Size(0, 35),
            padding: const EdgeInsets.symmetric(horizontal: 9),
            shape: const StadiumBorder(),
            textStyle: textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

class _InformationSearchBar extends StatelessWidget {
  const _InformationSearchBar({
    required this.controller,
    required this.onChanged,
    required this.onSubmitted,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(13),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.035),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        onSubmitted: onSubmitted,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: 'Cari berita bencana, lokasi, atau panduan...',
          hintStyle: TextStyle(color: Colors.blueGrey[300], fontSize: 12),
          prefixIcon: Icon(
            Icons.search,
            color: colorScheme.onSurfaceVariant,
            size: 20,
          ),
          suffixIcon: IconButton(
            onPressed: () =>
                _InformationPageStateMessage.show(context, 'Filter pencarian'),
            icon: Icon(
              Icons.tune,
              color: colorScheme.onSurfaceVariant,
              size: 19,
            ),
            tooltip: 'Filter pencarian',
          ),
          filled: true,
          fillColor: Colors.white,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(13),
            borderSide: BorderSide(color: Colors.blueGrey.shade100),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(13),
            borderSide: BorderSide(color: Colors.blueGrey.shade100),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(13),
            borderSide: BorderSide(color: colorScheme.secondary),
          ),
        ),
      ),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({
    required this.categories,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<_InformationCategory> categories;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (var index = 0; index < categories.length; index++) ...[
            if (index > 0) const SizedBox(width: 8),
            _CategoryChip(
              category: categories[index],
              selected: index == selectedIndex,
              onTap: () => onSelected(index),
            ),
          ],
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.category,
    required this.selected,
    required this.onTap,
  });

  final _InformationCategory category;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = selected ? Colors.white : const Color(0xFF172033);

    return Material(
      color: selected ? const Color(0xFFB84E00) : Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: selected
                  ? const Color(0xFFB84E00)
                  : Colors.blueGrey.shade100,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (category.icon case final icon?) ...[
                Icon(icon, size: 13, color: foreground),
                const SizedBox(width: 4),
              ],
              Text(
                category.label,
                style: Theme.of(context).textTheme.labelSmall
                    ?.copyWith(color: foreground, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeaturedStory extends StatelessWidget {
  const _FeaturedStory({required this.article, required this.repository});

  final Article article;
  final ArticleRepository repository;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push('/article/${article.slug}'),
      borderRadius: BorderRadius.circular(14),
      child: Ink(
        width: double.infinity,
        height: 145,
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.star_rounded, color: Color(0xFFB84E00)),
                    const SizedBox(height: 10),
                    Text(
                      article.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: const Color(0xFF334155),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      article.summary?.trim().isNotEmpty == true
                          ? article.summary!
                          : 'Informasi utama dipublikasikan dari RekanSiaga.',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall
                          ?.copyWith(color: const Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            ),
            if (article.coverImagePath?.isNotEmpty == true)
              ClipRRect(
                borderRadius: const BorderRadius.horizontal(
                  right: Radius.circular(14),
                ),
                child: ArticleCover(
                  article: article,
                  repository: repository,
                  height: 145,
                  width: 120,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _FeaturedStoryLoading extends StatelessWidget {
  const _FeaturedStoryLoading();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 145,
      child: Center(child: CircularProgressIndicator(color: Color(0xFFF57C00))),
    );
  }
}

class _FeaturedStoryEmpty extends StatelessWidget {
  const _FeaturedStoryEmpty();

  @override
  Widget build(BuildContext context) {
    return const _ArticleState(
      icon: Icons.article_outlined,
      title: 'Informasi utama belum tersedia',
      message: 'Belum ada artikel published atau informasi utama aktif.',
    );
  }
}

class _ArticleState extends StatelessWidget {
  const _ArticleState({
    required this.icon,
    required this.title,
    required this.message,
    this.onRetry,
  });

  final IconData icon;
  final String title;
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Icon(icon, color: const Color(0xFF64748B)),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleSmall
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF64748B)),
          ),
          if (onRetry != null) ...[
            const SizedBox(height: 10),
            OutlinedButton(onPressed: onRetry, child: const Text('Coba lagi')),
          ],
        ],
      ),
    );
  }
}

class _MonitoringCard extends StatelessWidget {
  const _MonitoringCard({
    required this.title,
    required this.count,
    required this.icon,
    required this.accent,
    required this.tint,
    required this.onTap,
  });

  final String title;
  final String count;
  final IconData icon;
  final Color accent;
  final Color tint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Card(
      margin: EdgeInsets.zero,
      color: Colors.white,
      elevation: 1.2,
      shadowColor: Colors.black.withValues(alpha: 0.08),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: tint,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: accent, size: 20),
            ),
            const SizedBox(height: 7),
            Text(
              count,
              style: textTheme.titleLarge?.copyWith(
                color: const Color(0xFF172033),
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              style: textTheme.labelSmall?.copyWith(
                color: const Color(0xFF172033),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onTap,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF174D39),
                  side: BorderSide(color: Colors.blueGrey.shade100),
                  minimumSize: const Size(0, 27),
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  textStyle: textTheme.labelSmall?.copyWith(
                    fontSize: 9,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                child: const FittedBox(child: Text('Lihat di Peta')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InformationCategory {
  const _InformationCategory({required this.label, required this.icon});

  final String label;
  final IconData? icon;
}

abstract final class _InformationPageStateMessage {
  static void show(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text('$message segera hadir.')));
  }
}
