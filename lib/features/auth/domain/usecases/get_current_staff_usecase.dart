import '../entities/staff.dart';
import '../repositories/auth_repository.dart';

class GetCurrentStaffUseCase {
  const GetCurrentStaffUseCase(this._repository);

  final AuthRepository _repository;

  Future<Staff> execute() {
    return _repository.getCurrentStaff();
  }
}
