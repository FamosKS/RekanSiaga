import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rekansiaga/features/auth/domain/entities/staff.dart';
import 'package:rekansiaga/features/auth/domain/repositories/auth_repository.dart';
import 'package:rekansiaga/features/auth/presentation/providers/login_provider.dart';

void main() {
  group('LoginController', () {
    test('calls the use case and exposes the authenticated staff', () async {
      final repository = _FakeAuthRepository();
      final container = ProviderContainer(
        overrides: [authRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);

      await container
          .read(loginControllerProvider.notifier)
          .login(email: ' staff@example.com ', password: 'secret');

      final state = container.read(loginControllerProvider);
      expect(repository.receivedEmail, 'staff@example.com');
      expect(state.status, LoginStatus.success);
      expect(state.staff?.id, 'staff-1');
    });

    test('exposes repository failures as login error state', () async {
      final repository = _FakeAuthRepository(
        failure: Exception('Invalid credentials'),
      );
      final container = ProviderContainer(
        overrides: [authRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);

      await container
          .read(loginControllerProvider.notifier)
          .login(email: 'staff@example.com', password: 'wrong');

      final state = container.read(loginControllerProvider);
      expect(state.status, LoginStatus.failure);
      expect(state.errorMessage, contains('Invalid credentials'));
    });
  });
}

class _FakeAuthRepository implements AuthRepository {
  _FakeAuthRepository({this.failure});

  final Exception? failure;
  String? receivedEmail;

  @override
  Future<Staff> loginStaff({
    required String email,
    required String password,
  }) async {
    receivedEmail = email;
    if (failure case final error?) {
      throw error;
    }
    return const Staff(
      id: 'staff-1',
      email: 'staff@example.com',
      fullName: 'Test Staff',
      role: StaffRole.staff,
      isActive: true,
    );
  }

  @override
  Future<void> logoutStaff() async {}

  @override
  Future<Staff> getCurrentStaff() async => const Staff(
    id: 'staff-1',
    email: 'staff@example.com',
    fullName: 'Test Staff',
    role: StaffRole.staff,
    isActive: true,
  );

  @override
  Future<StaffRole> getCurrentStaffRole() async => StaffRole.staff;
}
