import '../repositories/auth_repository.dart';

class LogoutStaffUseCase {
  const LogoutStaffUseCase(this._repository);

  final AuthRepository _repository;

  Future<void> execute() {
    return _repository.logoutStaff();
  }
}
