import '../entities/staff.dart';
import '../repositories/auth_repository.dart';

class GetCurrentStaffRoleUseCase {
  const GetCurrentStaffRoleUseCase(this._repository);

  final AuthRepository _repository;

  Future<StaffRole> execute() {
    return _repository.getCurrentStaffRole();
  }
}
