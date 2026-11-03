class EmergencyContact {
  const EmergencyContact({
    required this.id,
    required this.name,
    required this.phoneNumber,
    this.organization,
    this.instructions,
  });

  final String id;
  final String name;
  final String phoneNumber;
  final String? organization;
  final String? instructions;
}
