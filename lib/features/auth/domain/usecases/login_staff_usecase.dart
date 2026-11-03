import '../entities/staff.dart';
import '../repositories/auth_repository.dart';

class LoginStaffUseCase {
  const LoginStaffUseCase(this._repository);

  final AuthRepository _repository;

  Future<Staff> execute({
    required String email,
    required String password,
  }) async {
    final normalizedEmail = email.trim();
    final normalizedPassword = password.trim();

    if (normalizedEmail.isEmpty) {
      throw const FormatException('Email staff tidak boleh kosong.');
    }

    if (normalizedPassword.isEmpty) {
      throw const FormatException('Password staff tidak boleh kosong.');
    }

    return _repository.loginStaff(
      email: normalizedEmail,
      password: normalizedPassword,
    );
  }
}
