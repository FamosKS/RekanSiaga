import 'package:flutter/material.dart';

class PublicMapPage extends StatefulWidget {
  const PublicMapPage({super.key, required this.onEmergencyTap});

  final VoidCallback onEmergencyTap;

  @override
  State<PublicMapPage> createState() => _PublicMapPageState();
}

class _PublicMapPageState extends State<PublicMapPage> {
  bool _showVolunteers = true;
  bool _showPosts = true;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return ColoredBox(
      color: Colors.grey[50]!,
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _MapHeader(onEmergencyTap: widget.onEmergencyTap),
              const SizedBox(height: 20),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Peta RekanSiaga',
                          style: textTheme.titleLarge?.copyWith(
                            color: const Color(0xFF172033),
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Pantau risiko bencana, posko, dan relawan di sekitar Anda',
                          style: textTheme.bodySmall?.copyWith(
                            color: Colors.blueGrey[600],
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  const _ReadinessBadge(),
                ],
              ),
              const SizedBox(height: 14),
              const _MapPlaceholder(),
              const SizedBox(height: 12),
              const _MapCategoryFilters(),
              const SizedBox(height: 14),
              Text(
                'Lapisan Peta',
                style: textTheme.titleMedium?.copyWith(
                  color: const Color(0xFF172033),
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              _MapLayersCard(
                showVolunteers: _showVolunteers,
                showPosts: _showPosts,
                onVolunteersChanged: (value) {
                  setState(() {
                    _showVolunteers = value;
                  });
                },
                onPostsChanged: (value) {
                  setState(() {
                    _showPosts = value;
                  });
                },
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => _showMessage(context, 'Cek Risiko Lokasi'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFB84E00),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    minimumSize: const Size.fromHeight(42),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'Cek Risiko Lokasi Saya',
                        style: textTheme.labelLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
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

class _MapHeader extends StatelessWidget {
  const _MapHeader({required this.onEmergencyTap});

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

class _ReadinessBadge extends StatelessWidget {
  const _ReadinessBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF5EF),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: const BoxDecoration(
              color: Color(0xFF174D39),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            'Siaga',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: const Color(0xFF174D39),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _MapPlaceholder extends StatelessWidget {
  const _MapPlaceholder();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      width: double.infinity,
      height: 350,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F3F7),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blueGrey.shade100),
      ),
      alignment: Alignment.center,
      child: Text(
        'Area Peta Interaktif (Akan diintegrasikan dengan flutter_map atau google_maps_flutter)',
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodyMedium
            ?.copyWith(color: colorScheme.onSurfaceVariant, height: 1.5),
      ),
    );
  }
}

class _MapCategoryFilters extends StatelessWidget {
  const _MapCategoryFilters();

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: const [
        _MapCategoryChip(
          icon: Icons.landscape_outlined,
          label: 'Gunung berapi',
          color: Color(0xFF9A4B36),
        ),
        _MapCategoryChip(
          icon: Icons.flood_outlined,
          label: 'Banjir',
          color: Color(0xFF174D39),
        ),
        _MapCategoryChip(
          icon: Icons.local_fire_department_outlined,
          label: 'Api',
          color: Color(0xFFDC3545),
        ),
      ],
    );
  }
}

class _MapCategoryChip extends StatelessWidget {
  const _MapCategoryChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blueGrey.shade100),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: const Color(0xFF172033),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _MapLayersCard extends StatelessWidget {
  const _MapLayersCard({
    required this.showVolunteers,
    required this.showPosts,
    required this.onVolunteersChanged,
    required this.onPostsChanged,
  });

  final bool showVolunteers;
  final bool showPosts;
  final ValueChanged<bool> onVolunteersChanged;
  final ValueChanged<bool> onPostsChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      color: Colors.white,
      elevation: 1.2,
      shadowColor: Colors.black.withValues(alpha: 0.08),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Column(
          children: [
            _LayerToggleTile(
              icon: Icons.groups_2_outlined,
              title: 'Tampilkan Relawan',
              value: showVolunteers,
              onChanged: onVolunteersChanged,
            ),
            Divider(height: 1, color: Colors.blueGrey[100]),
            _LayerToggleTile(
              icon: Icons.festival_outlined,
              title: 'Tampilkan Posko',
              value: showPosts,
              onChanged: onPostsChanged,
            ),
          ],
        ),
      ),
    );
  }
}

class _LayerToggleTile extends StatelessWidget {
  const _LayerToggleTile({
    required this.icon,
    required this.title,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String title;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 31,
          height: 31,
          decoration: BoxDecoration(
            color: const Color(0xFFEAF5EF),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 17, color: Color(0xFF174D39)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: const Color(0xFF172033),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Switch(
          value: value,
          activeTrackColor: const Color(0xFFB84E00),
          activeThumbColor: Colors.white,
          onChanged: onChanged,
        ),
      ],
    );
  }
}
