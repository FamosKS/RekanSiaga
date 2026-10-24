import 'package:flutter/material.dart';

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
              const _InformationSearchBar(),
              const SizedBox(height: 12),
              _CategoryChips(
                categories: _categories,
                selectedIndex: _selectedCategory,
                onSelected: (index) => setState(() {
                  _selectedCategory = index;
                }),
              ),
              const SizedBox(height: 12),
              _FeaturedStory(
                onReadMore: () => _showMessage(context, 'Berita utama'),
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
                      count: '5',
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
                      count: '5',
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
                      count: '5',
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
            ],
          ),
        ),
      ),
    );
  }

  static void _showMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text('$message segera hadir.')));
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
  const _InformationSearchBar();

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
  const _FeaturedStory({required this.onReadMore});

  final VoidCallback onReadMore;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final currentDate = DateTime.now();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];

    return SizedBox(
      width: double.infinity,
      height: 145,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(
              'assets/images/hero-image.png',
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) =>
                  ColoredBox(color: Colors.grey.shade400),
            ),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Color(0x33000000),
                    Color(0xE6000000),
                  ],
                  stops: [0.15, 0.48, 1],
                ),
              ),
            ),
            Positioned(
              left: 10,
              right: 10,
              bottom: 8,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFB84E00),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'WASPADA',
                          style: textTheme.labelSmall?.copyWith(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(width: 7),
                      Text(
                        '${currentDate.day} ${monthNames[currentDate.month - 1]} ${currentDate.year}',
                        style: textTheme.labelSmall?.copyWith(
                          color: Colors.white70,
                          fontSize: 9,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'BNPB Pastikan Dukungan Operasional Berlanjut untuk Penanganan Karhutla Kaltim',
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.labelLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 4),
                  InkWell(
                    onTap: onReadMore,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFB84E00),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Baca Selengkapnya  →',
                        style: textTheme.labelSmall?.copyWith(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
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
