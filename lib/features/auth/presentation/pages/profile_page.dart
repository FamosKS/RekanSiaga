import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/routing/app_router.dart';
import '../../domain/entities/staff.dart';
import '../providers/login_provider.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen<LogoutState>(logoutControllerProvider, (previous, next) {
      if (next.status == LogoutStatus.success) {
        context.go(AppRoutes.login);
      } else if (next.status == LogoutStatus.failure &&
          previous?.status != LogoutStatus.failure) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(content: Text(next.errorMessage ?? 'Logout gagal.')),
          );
      }
    });

    final staffAsync = ref.watch(currentStaffProvider);
    final logoutState = ref.watch(logoutControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profil Staf')),
      body: staffAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stackTrace) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Gagal memuat profil: $error',
              textAlign: TextAlign.center,
            ),
          ),
        ),
        data: (staff) => _buildProfile(context, staff),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.all(20),
        child: FilledButton.icon(
          onPressed: logoutState.status == LogoutStatus.loading
              ? null
              : () => ref.read(logoutControllerProvider.notifier).logout(),
          icon: logoutState.status == LogoutStatus.loading
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.logout),
          label: const Text('Keluar'),
        ),
      ),
    );
  }

  Widget _buildProfile(BuildContext context, Staff staff) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const CircleAvatar(
          radius: 40,
          child: Icon(Icons.person_outline, size: 40),
        ),
        const SizedBox(height: 24),
        _ProfileField(label: 'Nama', value: staff.fullName),
        _ProfileField(label: 'Email', value: staff.email),
        _ProfileField(label: 'Role', value: _roleLabel(staff.role)),
      ],
    );
  }

  String _roleLabel(StaffRole role) {
    return switch (role) {
      StaffRole.superAdmin => 'Super Admin',
      StaffRole.admin => 'Admin',
      StaffRole.supervisor => 'Supervisor',
      StaffRole.staff => 'Staf',
    };
  }
}

class _ProfileField extends StatelessWidget {
  const _ProfileField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label, style: Theme.of(context).textTheme.labelLarge),
      subtitle: Text(value),
    );
  }
}
