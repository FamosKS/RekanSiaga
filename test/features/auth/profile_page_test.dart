import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:rekansiaga/core/routing/app_router.dart';
import 'package:rekansiaga/features/auth/domain/entities/staff.dart';
import 'package:rekansiaga/features/auth/domain/repositories/auth_repository.dart';
import 'package:rekansiaga/features/auth/presentation/pages/profile_page.dart';
import 'package:rekansiaga/features/auth/presentation/providers/login_provider.dart';

void main() {
  testWidgets('shows staff profile and logs out to login', (tester) async {
    final repository = _FakeAuthRepository();
    final router = GoRouter(
      initialLocation: '/profile',
      routes: [
        GoRoute(
          path: '/profile',
          builder: (context, state) => const ProfilePage(),
        ),
        GoRoute(
          path: AppRoutes.login,
          builder: (context, state) =>
              const Scaffold(body: Text('Login destination')),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          currentStaffProvider.overrideWith(
            (ref) async => const Staff(
              id: 'staff-1',
              email: 'admin@example.com',
              fullName: 'Admin Test',
              role: StaffRole.superAdmin,
              isActive: true,
            ),
          ),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Admin Test'), findsOneWidget);
    expect(find.text('admin@example.com'), findsOneWidget);
    expect(find.text('Super Admin'), findsOneWidget);

    await tester.tap(find.text('Keluar'));
    await tester.pumpAndSettle();

    expect(repository.logoutCalled, isTrue);
    expect(find.text('Login destination'), findsOneWidget);
    router.dispose();
  });
}

class _FakeAuthRepository implements AuthRepository {
  bool logoutCalled = false;

  @override
  Future<Staff> getCurrentStaff() async => const Staff(
    id: 'staff-1',
    email: 'admin@example.com',
    fullName: 'Admin Test',
    role: StaffRole.superAdmin,
    isActive: true,
  );

  @override
  Future<StaffRole> getCurrentStaffRole() async => StaffRole.superAdmin;

  @override
  Future<Staff> loginStaff({
    required String email,
    required String password,
  }) async => getCurrentStaff();

  @override
  Future<void> logoutStaff() async {
    logoutCalled = true;
  }
}
