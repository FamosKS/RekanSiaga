import '../entities/emergency_contact.dart';
import '../repositories/emergency_contact_repository.dart';

class GetEmergencyContactsUseCase {
  const GetEmergencyContactsUseCase(this._repository);

  final EmergencyContactRepository _repository;

  Future<List<EmergencyContact>> execute() {
    return _repository.getEmergencyContacts();
  }
}
