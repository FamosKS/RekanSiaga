import 'package:flutter/material.dart';

class PublicGuidesPage extends StatelessWidget {
  const PublicGuidesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.menu_book_outlined,
              size: 64,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text('Panduan Mitigasi', style: theme.textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              'Panduan kesiapsiagaan dan mitigasi segera hadir.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
