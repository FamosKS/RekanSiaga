import '../entities/staff.dart';

abstract interface class AuthRepository {
  Future<Staff> loginStaff({required String email, required String password});

  Future<void> logoutStaff();

  Future<Staff> getCurrentStaff();

  Future<StaffRole> getCurrentStaffRole();
}
