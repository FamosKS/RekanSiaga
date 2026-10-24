import '../entities/emergency_contact.dart';

abstract interface class EmergencyContactRepository {
  Future<List<EmergencyContact>> getEmergencyContacts();
}
